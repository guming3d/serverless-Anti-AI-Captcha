import * as path from 'path';
import * as lambda from '@aws-cdk/aws-lambda';
import { Construct, Stack, StackProps,  CfnParameter, CfnParameterProps } from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as iam from '@aws-cdk/aws-iam';
import {ManagedPolicy} from "@aws-cdk/aws-iam";
import * as cdk from '@aws-cdk/core';
import {CorsHttpMethod, HttpApi, HttpMethod} from "@aws-cdk/aws-apigatewayv2";
import * as apiGatewayIntegrations from '@aws-cdk/aws-apigatewayv2-integrations';
import * as logs from '@aws-cdk/aws-logs';

export class SolutionStack extends Stack {
  private _paramGroup: { [grpname: string]: CfnParameter[]} = {}

  protected setDescription(description: string) { this.templateOptions.description = description; }
  protected newParam(id: string, props?: CfnParameterProps): CfnParameter { return new CfnParameter(this, id, props); }
  protected addGroupParam(props: { [key: string]: CfnParameter[]}): void {
    for (const key of Object.keys(props)) {
      const params = props[key];
      this._paramGroup[key] = params.concat(this._paramGroup[key] ?? []);
    }
    this._setParamGroups();
  }
  private _setParamGroups(): void {
    if (!this.templateOptions.metadata) { this.templateOptions.metadata = {}; }
    const mkgrp = (label: string, params: CfnParameter[]) => {
      return {
        Label: { default: label },
        Parameters: params.map(p => {
          return p ? p.logicalId : '';
        }).filter(id => id),
      };
    };
    this.templateOptions.metadata['AWS::CloudFormation::Interface'] = {
      ParameterGroups: Object.keys(this._paramGroup).map(key => mkgrp(key, this._paramGroup[key]) ),
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
      default: 20,
    })

    //  create our HTTP Api
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
      partitionKey: {name: 'date', type: dynamodb.AttributeType.STRING},
      sortKey: {name: 'index', type: dynamodb.AttributeType.NUMBER},
      pointInTimeRecovery: true,
    });

    const lambdaARole = new iam.Role(this, 'LambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    lambdaARole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBFullAccess')
    );

    // define get captcha function
    const getCaptchaLambda = new lambda.Function(this, 'get-captcha-lambda', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      memorySize: 512,
      timeout: cdk.Duration.seconds(60),
      code: lambda.Code.fromAsset(path.join(__dirname, '/../lambda.d/captchaGenerator')),
      role: lambdaARole,
      environment: {
        DDB_TABLE_NAME: captcha_index_table.tableName,
        MAX_DAILY_INDEX: maxDailyIndex.valueAsString
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    getCaptchaLambda.node.addDependency(captcha_index_table);

    const getDogsLambdaIntegration = new apiGatewayIntegrations.LambdaProxyIntegration({
      handler: getCaptchaLambda,
    });

    // 👇 add route for GET /todos
    httpApi.addRoutes({
      path: '/captcha',
      methods: [HttpMethod.GET],
      integration: getDogsLambdaIntegration
    });

    new cdk.CfnOutput(this, 'httpUrl',{ value: httpApi.apiEndpoint  });
  }
}
