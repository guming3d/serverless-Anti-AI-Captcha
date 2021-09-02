import {Construct, IgnoreMode, NestedStack, NestedStackProps} from '@aws-cdk/core';
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecs_patterns from "@aws-cdk/aws-ecs-patterns";
import * as events from "@aws-cdk/aws-events";
import * as iam from "@aws-cdk/aws-iam";
import { DockerImageAsset } from '@aws-cdk/aws-ecr-assets';
import {ContainerImage} from "@aws-cdk/aws-ecs";
import * as path from "path";
import * as logs from "@aws-cdk/aws-logs";


export class CaptchaGeneratorStack extends NestedStack {

  constructor(scope: Construct, id: string, props: NestedStackProps) {
    super(scope, id, props);
    const vpc = new ec2.Vpc(this, "MyVpc", {
      maxAzs: 3 // Default is all AZs in region
    });

    const cluster = new ecs.Cluster(this, "CaptchaGeneratorCluster", {
      vpc: vpc
    });

    //TODO:need to implement
    const taskDefinitionDailyGenerateCaptcha= new ecs.FargateTaskDefinition(this, "DailyGenerateCaptchaFargateTask", {
      memoryLimitMiB: 2048,
      cpu: 512
    })


    const dailyCaptchaGeneratorImage = new DockerImageAsset(this, 'BulkLoadGraphDataImage', {
      directory: path.join(__dirname, '../'),
      file: 'container.d/load-captcha-data/Dockerfile',
      exclude: [
        'container.d/(!load-captcha-data)',
        'lambda.d/**',
        'lib/**',
        'scripts/**',
      ],
      ignoreMode: IgnoreMode.GLOB,
    });


    taskDefinitionDailyGenerateCaptcha.addContainer("DailyCaptchaGeneratorContainer", {
      image: ContainerImage.fromDockerImageAsset(dailyCaptchaGeneratorImage),
      cpu: 512,
      memoryLimitMiB: 2048,
      memoryReservationMiB: 2048,
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: "ecs",
        logGroup: new logs.LogGroup(this, "DailyGenerateCaptchaLogGroup", {
          logGroupName: "/ecs/DailyGenerateCaptchaLogGroup/ContainerLogs",
          retention: logs.RetentionDays.ONE_WEEK
        })
      }),
      //entryPoint: ["python3", "src/live_conversion.py"],
    })

    const permissions = new iam.PolicyStatement({
      actions: [
        "s3:*",
        "cloudwatch:*",
        "dynamodb:*"
      ],
      resources: ["*"]
    })

    taskDefinitionDailyGenerateCaptcha.addToTaskRolePolicy(permissions);
    new ecs_patterns.ScheduledFargateTask(this, "CaptchaGeneratorTask",{
      cluster: cluster,
      desiredTaskCount: 1,
      enabled: true,
      schedule: events.Schedule.expression("cron(0/15 * * * ? *)"),
      vpc: vpc,
      scheduledFargateTaskDefinitionOptions: {taskDefinition: taskDefinitionDailyGenerateCaptcha}
    });

  }
}
