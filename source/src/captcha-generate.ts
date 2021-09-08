import * as ecs from '@aws-cdk/aws-ecs';
import {ContainerImage, FargatePlatformVersion} from '@aws-cdk/aws-ecs';
import * as ec2 from "@aws-cdk/aws-ec2";
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

export interface CaptchaGeneratorStackProps extends NestedStackProps {
}

export class CaptchaGeneratorStack extends NestedStack {

  constructor(scope: Construct, id: string, props: CaptchaGeneratorStackProps) {
    super(scope, id, props);

    // create states of step functions for pipeline
    const failure = new sfn.Fail(this, 'Fail', {
      comment: 'Captcha Producer workflow failed',
    });
    const vpc = ec2.Vpc.fromLookup(this, 'ExistingVpc', {
      vpcName: 'IntelligentCaptchaStack/CaptchaGenerator/MyVpc,'
    });

    const cluster = new ecs.Cluster(this, 'CaptchaGenerating', {
      vpc: vpc
    });


    const taskDefinition = new ecs.FargateTaskDefinition(this, 'CaptchaGeneratingTask', {
      memoryLimitMiB: 2048,
      cpu: 256,
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

    const containerDefinition = taskDefinition.addContainer('TheContainer', {
      image: ContainerImage.fromDockerImageAsset(dailyCaptchaGeneratorImage),
      cpu: 256,
      memoryLimitMiB: 2048,
      memoryReservationMiB: 2048,
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: "ecs",
        logGroup: new logs.LogGroup(this, "DailyGenerateCaptchaLogGroup", {
          logGroupName: "/ecs/DailyGenerateCaptchaLogGroup/ContainerLogs",
          retention: logs.RetentionDays.ONE_WEEK
        })
      }),
      environment:
        {
          // CAPTCHA_DDB_NAME: ddbName,
          // CAPTCHA_NUMBER: captchaNumber,
          // REGION_NAME: Aws.REGION,
          // S3_BUCKET_NAME: s3_bucket_name
        },
    });

    const triggerFunction = new NodejsFunction(this, 'captchaGeneratingTrigger', {
      entry: path.join(__dirname, '../lambda.d/captcha-trigger/index.ts'),
      handler: 'TriggerHandler',
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
        environment: [{name: 'SOME_KEY', value: sfn.JsonPath.stringAt('$.SomeKey')}],
      }],
      launchTarget: new EcsFargateLaunchTarget({
        platformVersion: FargatePlatformVersion.VERSION1_4,
      }),
    }).addCatch(failure, {
      errors: [Errors.ALL],
      resultPath: '$.error',
    });

    const definition = captchaProducerTriggerTask.next(runTask)

    new StateMachine(this, 'CaptchaProducingPipeline', {
      definition,
      logs: {
        destination: new logs.LogGroup(this, 'FraudDetectionLogGroup', {
          retention: logs.RetentionDays.SIX_MONTHS,
          logGroupName: `/aws/vendedlogs/states/fraud-detetion/training-pipeline/${this.stackName}`,
        }),
        includeExecutionData: true,
        level: LogLevel.ALL,
      },
      tracingEnabled: true,
    });

  }
}
