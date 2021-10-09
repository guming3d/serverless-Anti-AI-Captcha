import * as ecs from '@aws-cdk/aws-ecs';
import {ContainerImage, FargatePlatformVersion} from '@aws-cdk/aws-ecs';
import * as tasks from '@aws-cdk/aws-stepfunctions-tasks'
import {EcsFargateLaunchTarget, LambdaInvoke} from '@aws-cdk/aws-stepfunctions-tasks'
import * as sfn from '@aws-cdk/aws-stepfunctions'
import {Errors, IntegrationPattern, LogLevel, StateMachine} from '@aws-cdk/aws-stepfunctions'
import * as cdk from "@aws-cdk/core";
import {Aws, Construct, Duration, IgnoreMode, NestedStack, NestedStackProps} from "@aws-cdk/core";
import {DockerImageAsset} from "@aws-cdk/aws-ecr-assets";
import * as path from "path";
import * as logs from "@aws-cdk/aws-logs";
import {NodejsFunction} from "@aws-cdk/aws-lambda-nodejs";
import {Runtime, Tracing} from "@aws-cdk/aws-lambda";
import {Rule, Schedule} from '@aws-cdk/aws-events';
import {SfnStateMachine} from '@aws-cdk/aws-events-targets';
import * as iam from "@aws-cdk/aws-iam";
import {IVpc} from "@aws-cdk/aws-ec2";
import {print} from "aws-cdk/lib/logging";
import {ManagedPolicy} from "@aws-cdk/aws-iam";

export interface CaptchaGeneratorStackProps extends NestedStackProps {
  readonly inputVPC: IVpc
  readonly ddb_name: string,
  readonly captcha_number: string,
  readonly captcha_s3_bucket: string,
  readonly captcha_generate_result_sns_arn: string,
  readonly captcha_generate_start_hour: string
}

export class CaptchaGeneratorStack extends NestedStack {

  constructor(scope: Construct, id: string, props: CaptchaGeneratorStackProps) {
    super(scope, id, props);

    this.templateOptions.description = "(SO8013) - Intelligent Captcha nested stack to generate the captcha images in daily.";

    const ddbName = props.ddb_name
    const captchaNumber = props.captcha_number
    const s3_bucket_name = props.captcha_s3_bucket
    const vpc = props.inputVPC
    const sns_topic_arn = props.captcha_generate_result_sns_arn
    const captcha_generate_hour = props.captcha_generate_start_hour

    // create states of step functions for pipeline
    const failure = new sfn.Fail(this, 'Fail', {
      comment: 'Captcha Producer workflow failed',
    });


    for ( let i = 0; i < vpc.publicSubnets.length; i++) {
      print("public subnet number is %s",vpc.publicSubnets[i].subnetId);
    }
    for ( let i = 0; i < vpc.privateSubnets.length; i++) {
      print("private subnet number is %s",vpc.privateSubnets[i].subnetId);
    }
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
          S3_BUCKET_NAME: s3_bucket_name,
          TARGET_DATE: '$.payload.target_date'
        },
    });

    const lambdaRole = new iam.Role(this, 'TriggerCaptchaLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    // front end lambda only need to access DynamoDB
    lambdaRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBFullAccess')
    );
    lambdaRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
    );

    lambdaRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName('AmazonSNSFullAccess')
    );

    const failureFunction = new NodejsFunction(this, 'captchaGeneratingFailure', {
      entry: path.join(__dirname, '../lambda.d/captcha-failure/index.js'),
      handler: 'failureHandler',
      timeout: Duration.seconds(30),
      memorySize: 128,
      runtime: Runtime.NODEJS_14_X,
      tracing: Tracing.ACTIVE,
      role: lambdaRole,
      environment: {
        SNS_TOPIC_ARN: sns_topic_arn,
        DDB_TABLE_NAME: ddbName,
      }
    });

    const captchaProducerFailTask = new class extends LambdaInvoke {
      public toStateJson(): object {
        return {
          ...super.toStateJson(),
          ResultSelector: {
            'parameters.$': '$.Payload.parameters',
          },
        };
      }
    }(this, 'captcha generating failed', {
      lambdaFunction: failureFunction,
      integrationPattern: IntegrationPattern.REQUEST_RESPONSE,
    }).addCatch(failure, {
      errors: [Errors.ALL],
      resultPath: '$.error',
    });


    const triggerFunction = new NodejsFunction(this, 'captchaGeneratingTrigger', {
      entry: path.join(__dirname, '../lambda.d/captcha-trigger/index.js'),
      handler: 'triggerHandler',
      timeout: Duration.seconds(30),
      memorySize: 128,
      runtime: Runtime.NODEJS_14_X,
      tracing: Tracing.ACTIVE,
      role: lambdaRole,
      environment: {
        DDB_TABLE_NAME: ddbName
      }
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
    }).addCatch(captchaProducerFailTask, {
      errors: [Errors.ALL],
      resultPath: '$.error',
    });

    const completeFunction = new NodejsFunction(this, 'captchaGeneratingComplete', {
      entry: path.join(__dirname, '../lambda.d/captcha-complete/index.js'),
      handler: 'completeHandler',
      timeout: Duration.seconds(30),
      memorySize: 128,
      runtime: Runtime.NODEJS_14_X,
      tracing: Tracing.ACTIVE,
      role: lambdaRole,
      environment: {
        DDB_TABLE_NAME: ddbName,
        SNS_TOPIC_ARN: sns_topic_arn
      }
    });

    const captchaProducerCompleteTask = new class extends LambdaInvoke {
      public toStateJson(): object {
        return {
          ...super.toStateJson(),
          ResultSelector: {
            'parameters.$': '$.Payload.parameters',
          },
        };
      }
    }(this, 'captcha generating complete', {
      lambdaFunction: completeFunction,
      integrationPattern: IntegrationPattern.REQUEST_RESPONSE,
    }).addCatch(captchaProducerFailTask, {
      errors: [Errors.ALL],
      resultPath: '$.error',
    });

    const runTask = new tasks.EcsRunTask(this, 'CaptchaGenerating', {
      integrationPattern: sfn.IntegrationPattern.RUN_JOB,
      cluster: cluster,
      taskDefinition: taskDefinition,
      assignPublicIp: true,
      containerOverrides: [{
        containerDefinition: containerDefinition,

      }],
      launchTarget: new EcsFargateLaunchTarget({
        platformVersion: FargatePlatformVersion.VERSION1_4,
      }),
    }).addCatch(captchaProducerFailTask, {
      errors: [Errors.ALL],
      resultPath: '$.error',
    });

    const definition = captchaProducerTriggerTask.next(runTask).next(captchaProducerCompleteTask);

    const captchaStateMachine = new StateMachine(this, 'CaptchaProducingPipeline', {
      definition,
      logs: {
        destination: new logs.LogGroup(this, 'FraudDetectionLogGroup', {
          retention: logs.RetentionDays.SIX_MONTHS,
          logGroupName: `/step-function/captcha-generating-pipeline/${this.stackName}`,
        }),
        includeExecutionData: true,
        level: LogLevel.ERROR,
      },
      tracingEnabled: false,
    });

    //eventBridge to trigger the captcha generating step-function daily at 16:00 China localtime(8:00 UTC time)
    new Rule(this, 'CaptchaSchedulingRule', {
      schedule: Schedule.cron({minute: '0', hour: captcha_generate_hour}),
      targets: [new SfnStateMachine(captchaStateMachine)],
    });

    new cdk.CfnOutput(this, 'captcha_generating_workflow', {value: captchaStateMachine.stateMachineName});
  }
}
