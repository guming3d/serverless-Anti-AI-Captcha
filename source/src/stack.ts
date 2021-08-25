import * as path from 'path';
import {Construct, Stack, StackProps,  CfnParameter, CfnParameterProps } from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';

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

// class MyImage implements ec2.IMachineImage {
//   private mapping: { [k1: string]: { [k2: string]: any } } = {};
//   constructor(readonly amiMap: { [region: string]: string }) {
//     for (const [region, ami] of Object.entries(amiMap)) {
//       this.mapping[region] = { ami };
//     }
//   }
//   public getImage(parent: Construct): ec2.MachineImageConfig {
//     const amiMap = new CfnMapping(parent, 'AmiMap', { mapping: this.mapping });
//     return {
//       imageId: amiMap.findInMap(Aws.REGION, 'ami'),
//       userData: ec2.UserData.forLinux(),
//       osType: ec2.OperatingSystemType.LINUX,
//     };
//   }
// }

export class IntelligentCaptchaStack extends SolutionStack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // const vpc= new ec2.Vpc(this, 'VPC');
    //
    // new ec2.Instance(this, 'Instance', {
    //   vpc,
    //   instanceType: new ec2.InstanceType('t2.micro'),
    //   machineImage: new MyImage({
    //     'cn-north-1': 'ami-cn-north-1',
    //     'cn-northwest-1': 'ami-cn-northwest-1',
    //   }),
    // });
    this.setDescription("(SO####) - Intelligent Captcha stack.");

    const layer = new lambda.LayerVersion(this, 'MyLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/'), {
        bundling: {
          image: lambda.Runtime.NODEJS_14_X.bundlingImage,
          command: [
            'bash', '-xc', [
              'export npm_config_update_notifier=false',
              'export npm_config_cache=$(mktemp -d)', // https://github.com/aws/aws-cdk/issues/8707#issuecomment-757435414
              'cd $(mktemp -d)',
              'cp -v /asset-input/package*.json .',
              'npm i --only=prod',
              'mkdir -p /asset-output/nodejs/',
              'cp -au node_modules /asset-output/nodejs/',
            ].join('&&'),
          ],
        },
      }),
      compatibleRuntimes: [lambda.Runtime.NODEJS_14_X],
      description: 'A layer to test the L2 construct',
    });

    new lambda.Function(this, 'CaptchaHandler', {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda.d/captchaGenerator')),
      handler: 'getCaptcha',
      layers: [layer],
    });


    //Real things adding here

    // const captchaFnRole = new Role(this, 'TokenFuncRole', {
    //   assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    //   managedPolicies: [
    //     ManagedPolicy.fromAwsManagedPolicyName(
    //       'service-role/AWSLambdaBasicExecutionRole',
    //     ),
    //   ],
    // });
    // // Create a lambda that returns captcha results
    // const captchaGenerator = new NodejsFunction(, 'captchaGenerator', {
    //   entry: path.join(__dirname, '../lambda.d/captchaGenerator/captcha.ts'),
    //   handler: 'getCaptcha',
    //   timeout: Duration.seconds(30),
    //   memorySize: 512,
    //   role: captchaFnRole,
    //   runtime: Runtime.NODEJS_14_X,
    //   tracing: Tracing.ACTIVE,
    // });
    //
    // const captchaFnIntegration = new LambdaProxyIntegration({
    //   handler: captchaGenerator,
    //   payloadFormatVersion: PayloadFormatVersion.VERSION_2_0,
    // });



  }
}
