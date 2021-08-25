import * as path from 'path';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as lambda from '@aws-cdk/aws-lambda';
import { Construct, Stack, StackProps, CfnMapping, CfnParameter, CfnParameterProps, Aws } from '@aws-cdk/core';

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

    const api = new apigateway.RestApi(this, 'api', {
      description: 'example api gateway',
      deployOptions: {
        stageName: 'dev',
      },
    });

    new cdk.CfnOutput(this, 'apiUrl', {value: api.url});

    // define get captcha function
    const getCaptchaLambda = new lambda.Function(this, 'get-captcha-lambda', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'getCaptcha',
      code: lambda.Code.fromAsset(path.join(__dirname, '/../lambda.d/captchaGenerator')),
    });

    // add a /captcha resource
    const todos = api.root.addResource('captcha');

    // integrate GET /captcha with getCaptchaLambda
    todos.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getCaptchaLambda, {proxy: true}),
    );
  }
}
