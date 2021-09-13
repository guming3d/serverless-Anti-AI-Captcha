import * as ecs from '@aws-cdk/aws-ecs';
import {ContainerImage, FargatePlatformVersion} from '@aws-cdk/aws-ecs';
import * as tasks from '@aws-cdk/aws-stepfunctions-tasks'
import {EcsFargateLaunchTarget, LambdaInvoke} from '@aws-cdk/aws-stepfunctions-tasks'
import * as sfn from '@aws-cdk/aws-stepfunctions'
import {Errors, IntegrationPattern, LogLevel, StateMachine} from '@aws-cdk/aws-stepfunctions'
import {Aws, Construct, Duration, IgnoreMode, NestedStack, NestedStackProps} from "@aws-cdk/core";
import {DockerImageAsset} from "@aws-cdk/aws-ecr-assets";
import * as path from "path";
import * as logs from "@aws-cdk/aws-logs";
import {NodejsFunction} from "@aws-cdk/aws-lambda-nodejs";
import {Runtime, Tracing} from "@aws-cdk/aws-lambda";
import { Rule, Schedule } from '@aws-cdk/aws-events';
import { SfnStateMachine } from '@aws-cdk/aws-events-targets';
import * as iam from "@aws-cdk/aws-iam";
import { GatewayVpcEndpointAwsService, Vpc} from "@aws-cdk/aws-ec2";

export interface CaptchaGeneratorStackProps extends NestedStackProps {
  readonly ddb_name: string,
  readonly captcha_number: string,
  readonly captcha_s3_bucket: string
}

export class CaptchaGeneratorStack extends NestedStack {

  constructor(scope: Construct, id: string, props: CaptchaGeneratorStackProps) {
    super(scope, id, props);

    const ddbName = props.ddb_name
    const captchaNumber = props.captcha_number
    const s3_bucket_name = props.captcha_s3_bucket

    // create states of step functions for pipeline
    const failure = new sfn.Fail(this, 'Fail', {
      comment: 'Captcha Producer workflow failed',
    });

    const vpcId = this.node.tryGetContext('vpcId');
    const vpc = vpcId ? Vpc.fromLookup(this, 'CaptchaGeneratorVpc', {
      vpcId: vpcId === 'default' ? undefined : vpcId,
      isDefault: vpcId === 'default' ? true : undefined,
    }) : (() => {
      const newVpc = new Vpc(this, 'CaptchaGeneratorVpc', {
        maxAzs: 3,
        gatewayEndpoints: {
          s3: {
            service: GatewayVpcEndpointAwsService.S3,
          },
          dynamodb: {
            service: GatewayVpcEndpointAwsService.DYNAMODB,
          },
        },
        enableDnsHostnames: true,
        enableDnsSupport: true
      });
      return newVpc;
    })();

    if (vpc.privateSubnets.length < 1) {
      throw new Error('The VPC must have PRIVATE subnet.');
    }

    const cluster = new ecs.Cluster(this, 'CaptchaGeneratingCluster', {
      vpc: vpc
    });

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'CaptchaGeneratingTask', {
      memoryLimitMiB: 8192,
      cpu: 2048,
    });

    const dailyCaptchaGeneratorImage = new DockerImageAsset(this, 'DailyCaptchaGeneratingImage', {
      directory: path.join(__dirname, '../'),
      file: 'container.d/generate-captcha-data/Dockerfile',
      exclude: [
        'container.d/(!generate-captcha-data)',
        'lambda.d/**',
        'lib/**',
        'scripts/**',
      ],
      ignoreMode: IgnoreMode.GLOB,
    });

    const permissions = new iam.PolicyStatement({
      actions: [
        "s3:*",
        "cloudwatch:*",
        "dynamodb:*"
      ],
      resources: ["*"]
    })

    taskDefinition.addToTaskRolePolicy(permissions);

    const containerDefinition = taskDefinition.addContainer('TheCaptchaGeneratingContainer', {
      image: ContainerImage.fromDockerImageAsset(dailyCaptchaGeneratorImage),
      cpu: 2048,
      memoryLimitMiB: 8192,
      memoryReservationMiB: 8192,
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: "ecs",
        logGroup: new logs.LogGroup(this, "DailyGenerateCaptchaLogGroup", {
          logGroupName: "/ecs/DailyGenerateCaptchaLogGroup/ContainerLogs",
          retention: logs.RetentionDays.ONE_WEEK
        })
      }),
      environment:
        {
          CAPTCHA_DDB_NAME: ddbName,
          CAPTCHA_NUMBER: captchaNumber,
          REGION_NAME: Aws.REGION,
          S3_BUCKET_NAME: s3_bucket_name
        },
    });

    const triggerFunction = new NodejsFunction(this, 'captchaGeneratingTrigger', {
      entry: path.join(__dirname, '../lambda.d/captcha-trigger/index.ts'),
      handler: 'triggerHandler',
      timeout: Duration.seconds(30),
      memorySize: 128,
      runtime: Runtime.NODEJS_14_X,
      tracing: Tracing.ACTIVE,
    });

    const captchaProducerTriggerTask = new class extends LambdaInvoke {
      public toStateJson(): object {
        return {
          ...super.toStateJson(),
          ResultSelector: {
            'parameters.$': '$.Payload.parameters',
          },
        };
      }
    }(this, 'trigger captcha generating', {
      lambdaFunction: triggerFunction,
      integrationPattern: IntegrationPattern.REQUEST_RESPONSE,
    }).addCatch(failure, {
      errors: [Errors.ALL],
      resultPath: '$.error',
    });

    const runTask = new tasks.EcsRunTask(this, 'CaptchaGenerating', {
      integrationPattern: sfn.IntegrationPattern.RUN_JOB,
      cluster: cluster,
      taskDefinition: taskDefinition,
      assignPublicIp: false,
      containerOverrides: [{
        containerDefinition: containerDefinition,
        command: [
          '--data_prefix',
          // props.bucket.s3UrlForObject(props.neptune.loadObjectPrefix),
          'AAAA',
          '--temp_folder',
          '--neptune_endpoint',
          '--neptune_port',
          // Token.asString(props.neptune.cluster.clusterEndpoint.port),
          '--region',
          Aws.REGION,
          '--neptune_iam_role_arn',
          // props.neptune.loadRole,
        ],
        // environment: [{name: 'SOME_KEY', value: sfn.JsonPath.stringAt('$.SomeKey')}],
      }],
      launchTarget: new EcsFargateLaunchTarget({
        platformVersion: FargatePlatformVersion.VERSION1_4,
      }),
    }).addCatch(failure, {
      errors: [Errors.ALL],
      resultPath: '$.error',
    });

    const definition = captchaProducerTriggerTask.next(runTask)

    const captchaStateMachine = new StateMachine(this, 'CaptchaProducingPipeline', {
      definition,
      logs: {
        destination: new logs.LogGroup(this, 'FraudDetectionLogGroup', {
          retention: logs.RetentionDays.SIX_MONTHS,
          logGroupName: `/aws/vendedlogs/states/captcha-generating-pipeline/${this.stackName}`,
        }),
        includeExecutionData: true,
        level: LogLevel.ALL,
      },
      tracingEnabled: true,
    });

    //eventBridge to trigger the lambda daily
    new Rule(this, 'CaptchaSchedulingRule', {
      schedule: Schedule.cron({ minute: '0', hour: '8' }),
      targets: [new SfnStateMachine(captchaStateMachine)],
    });

  }
}
