/* eslint import/no-unresolved: "off" */
import { STSClient, AssumeRoleCommand, Credentials } from '@aws-sdk/client-sts';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';

export type CaptchaHandler = APIGatewayProxyHandlerV2<Credentials>;

export const getCaptcha: CaptchaHandler = async (event, context) => {
  console.info(`Receiving captcha request ${JSON.stringify(event, null, 2)}.`);

  return;
};
