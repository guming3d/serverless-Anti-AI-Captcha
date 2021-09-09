import * as path from 'path';
import * as lambda from '@aws-cdk/aws-lambda';
import {Construct, Stack, StackProps, CfnParameter, CfnParameterProps, RemovalPolicy, Duration} from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as iam from '@aws-cdk/aws-iam';
import {ManagedPolicy} from "@aws-cdk/aws-iam";
import * as cdk from '@aws-cdk/core';
import {CaptchaLoaderStack} from "./captcha-load";
import {CorsHttpMethod, HttpApi, HttpMethod} from "@aws-cdk/aws-apigatewayv2";
import * as apiGatewayIntegrations from '@aws-cdk/aws-apigatewayv2-integrations';
import * as logs from '@aws-cdk/aws-logs';
import {Bucket, BucketEncryption} from "@aws-cdk/aws-s3";
import {CaptchaGeneratorStack} from "./captcha-generate";

export class SolutionStack extends Stack {
  private _paramGroup: { [grpname: string]: CfnParameter[] } = {}

  protected setDescription(description: string) {
    this.templateOptions.description = description;
  }

  protected newParam(id: string, props?: CfnParameterProps): CfnParameter {
    return new CfnParameter(this, id, props);
  }

  protected addGroupParam(props: { [key: string]: CfnParameter[] }): void {
    for (const key of Object.keys(props)) {
      const params = props[key];
      this._paramGroup[key] = params.concat(this._paramGroup[key] ?? []);
    }
    this._setParamGroups();
  }

  private _setParamGroups(): void {
    if (!this.templateOptions.metadata) {
      this.templateOptions.metadata = {};
    }
    const mkgrp = (label: string, params: CfnParameter[]) => {
      return {
        Label: {default: label},
        Parameters: params.map(p => {
          return p ? p.logicalId : '';
        }).filter(id => id),
      };
    };
    this.templateOptions.metadata['AWS::CloudFormation::Interface'] = {
      ParameterGroups: Object.keys(this._paramGroup).map(key => mkgrp(key, this._paramGroup[key])),
    };
  }
}

export class IntelligentCaptchaStack extends SolutionStack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    this.setDescription("(SO####) - Intelligent Captcha stack.");

    const maxDailyIndex = new CfnParameter(this, 'MaxDailyCaptchaNumber', {
      description: 'Max number of Captcha to be generated each day',
      type: 'Number',
      default: 100,
    })

    const captchaKeepingDays = new CfnParameter(this, 'MaxCaptchaKeepDays', {
      description: 'Max number of days to keep generated Captcha in S3',
      type: 'Number',
      default: 7,
    })

    const accessLogBucket = new Bucket(this, 'BucketAccessLog', {
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.RETAIN,
      serverAccessLogsPrefix: 'accessLogBucketAccessLog',
    });

    const captcha_s3_bucket = new Bucket(this, 'CaptchaGenerationBucket', {
      bucketName: "captcha-generator-buckets-"+this.account+'-'+this.region,
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.RETAIN,
      serverAccessLogsBucket: accessLogBucket,
      serverAccessLogsPrefix: 'dataBucketAccessLog',
      lifecycleRules: [
        {
          enabled: true,
          expiration: Duration.days(captchaKeepingDays.valueAsNumber),
        },
      ],
    });

    const httpApi = new HttpApi(this, 'http-api-captcha', {
      description: 'HTTP API for getting captcha',
      corsPreflight: {
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
        ],
        allowMethods: [
          CorsHttpMethod.OPTIONS,
          CorsHttpMethod.GET,
          CorsHttpMethod.PUT,
        ],
        allowCredentials: true,
      },
    });

    // create Dynamodb table to save the captcha index file
    const captcha_index_table = new dynamodb.Table(this, 'Captcha_index', {
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 10,
      writeCapacity: 50,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      partitionKey: {name: 'captcha_date', type: dynamodb.AttributeType.STRING},
      sortKey: {name: 'captcha_index', type: dynamodb.AttributeType.NUMBER},
      pointInTimeRecovery: true,
      timeToLiveAttribute: 'ExpirationTime'
    });

    const lambdaRole = new iam.Role(this, 'LambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    // front end lambda only need to access DynamoDB
    lambdaRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBFullAccess')
    );

    // define get captcha function
    const getCaptchaLambda = new lambda.Function(this, 'get-captcha-lambda', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      memorySize: 512,
      timeout: cdk.Duration.seconds(60),
      code: lambda.Code.fromAsset(path.join(__dirname, '/../lambda.d/captchaGenerator')),
      role: lambdaRole,
      environment: {
        DDB_TABLE_NAME: captcha_index_table.tableName,
        MAX_DAILY_INDEX: maxDailyIndex.valueAsString
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    getCaptchaLambda.node.addDependency(captcha_index_table);

    //Offline Captcha generator stack with ECS schedule tasks
    const captchaLoaderStack = new CaptchaLoaderStack(this, 'CaptchaLoader', {
      ddb_name : captcha_index_table.tableName,
      captcha_number : maxDailyIndex.valueAsString,
      captcha_s3_bucket : captcha_s3_bucket.bucketName
      }
    );

    captchaLoaderStack.node.addDependency(captcha_index_table);
    captchaLoaderStack.node.addDependency(captcha_s3_bucket);

    const captchaGeneratorStack = new CaptchaGeneratorStack(this, 'CaptchaGenerator', {
      ddb_name : captcha_index_table.tableName,
      captcha_number : maxDailyIndex.valueAsString,
      captcha_s3_bucket : captcha_s3_bucket.bucketName
      }
    );
    captchaGeneratorStack.node.addDependency(captchaLoaderStack);

    const getCaptchaLambdaIntegration = new apiGatewayIntegrations.LambdaProxyIntegration({
      handler: getCaptchaLambda,
    });

    // 👇 add route for GET /captcha
    httpApi.addRoutes({
      path: '/captcha',
      methods: [HttpMethod.GET],
      integration: getCaptchaLambdaIntegration
    });

    new cdk.CfnOutput(this, 'httpUrl', {value: httpApi.apiEndpoint});
  }
}
