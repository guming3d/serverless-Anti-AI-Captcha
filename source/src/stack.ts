import * as path from 'path';
import * as lambda from '@aws-cdk/aws-lambda';
import { Construct, Stack, StackProps,  CfnParameter, CfnParameterProps } from '@aws-cdk/core';
import {EndpointType} from "@aws-cdk/aws-apigateway";
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as iam from '@aws-cdk/aws-iam';
import {ManagedPolicy} from "@aws-cdk/aws-iam";
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as cdk from '@aws-cdk/core';
import * as apigateway2 from '@aws-cdk/aws-apigatewayv2'
import {HttpMethod} from "@aws-cdk/aws-apigatewayv2";
import {HttpProxyIntegration, LambdaProxyIntegration} from "@aws-cdk/aws-apigatewayv2-integrations";
import {handler} from "aws-cdk/lib/commands/docs";

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


    const api2 = new apigateway2.HttpApi(this,'httpapi',{
      description: 'HTTP API for captcha service',
      corsPreflight: {
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
        ]
      },
    });
    const api = new apigateway.RestApi(this, 'api', {
      description: 'example api gateway',
      deployOptions: {
        stageName: 'dev',
      },
      endpointConfiguration:{
        types: [EndpointType.REGIONAL]
      }
    });

    new cdk.CfnOutput(this, 'apiUrl', {value: api.url});
    new cdk.CfnOutput(this, 'httpUrl',{value: api2.url});

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
        DDB_TABLE_NAME: captcha_index_table.tableName
      }
    });

    getCaptchaLambda.node.addDependency(captcha_index_table);

    // add a /captcha resource
    const captcha = api.root.addResource('captcha');

    const getCaptchaIntegration = new HttpProxyIntegration({
      url: api2.url.toString(),
    });

    const getCaptchaIntegration = new LambdaProxyIntegration(
      handler: getCaptchaLambda;
    )
    api2.addRoutes({
      path: '/todos',
      methods: [HttpMethod.GET],

      integration: new LambdaProxyIntegration({
        apigateway2.handler : getCaptchaLambda
      }),
    });

    // integrate GET /captcha with getCaptchaLambda
    captcha.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getCaptchaLambda, {proxy: true}),
    );

    console.log('table name 👉', captcha_index_table.tableName);
    console.log('table arn 👉', captcha_index_table.tableArn);
  }
}
