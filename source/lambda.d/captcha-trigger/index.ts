/* eslint import/no-unresolved: "off" */
import { Handler } from 'aws-lambda';

export type TriggerHandler = Handler<Parameters, ParametersOutput>;

export interface Parameters {
  readonly captchaTriggerJob?: {
  };
}

export interface ParametersOutput {
  readonly parameters: {
    readonly captchaGeneratingJob: {
    };
  };
}

export const triggerHandler: TriggerHandler = async (para, _context) => {
  console.debug(`Receiving captcha generating event ${JSON.stringify(para, null, 2)}.`);

  const parameters: ParametersOutput = {
    parameters: {
      captchaGeneratingJob: {
      },
    },
  };
  return parameters;
};
