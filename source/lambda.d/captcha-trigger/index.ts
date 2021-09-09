/* eslint import/no-unresolved: "off" */
import { Handler } from 'aws-lambda';

export type TriggerHandler = Handler<Parameters, ParametersOutput>;

export interface Parameters {
  readonly trainingJob?: {
    // instanceType?: string;
    // instanceCount?: number;
    // timeoutInSeconds?: number;
  };
}

export interface ParametersOutput {
  readonly parameters: {
    readonly captchaGeneratingJob: {
      // instanceType: string;
      // instanceCount: number;
      // timeoutInSeconds: number;
    };
  };
}

export const triggerHandler: TriggerHandler = async (para, _context) => {
  console.info(`Receiving captcha generating event ${JSON.stringify(para, null, 2)}.`);

  const parameters: ParametersOutput = {
    parameters: {
      captchaGeneratingJob: {
      },
    },
  };
  return parameters;
};
