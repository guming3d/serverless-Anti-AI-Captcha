/* eslint-disable no-undef */

exports.completeHandler = function (event, context, callback) {

  console.debug(`Receiving captcha generating complete event`);

  //increase the write capacity to 2000
  // Load the AWS SDK for Node.js
  let AWS = require('aws-sdk');

  // Set the region
  AWS.config.update({region: process.env.AWS_REGION});

  const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;

  // Create the DynamoDB service object
  let ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
  let ddbtablename = process.env.DDB_TABLE_NAME
  let params = {
    TableName: ddbtablename,
    ProvisionedThroughput: {
      WriteCapacityUnits: 5,
      ReadCapacityUnits: 50
    },
  };

  ddb.updateTable(params, function (err, data) {
    if (err) {
      console.error(err, err.stack);
      callback(Error("failed to update the write capacity unit of dynamodb to 5"));
    } // an error occurred
    else console.debug("Succeed update the write capacity unit to 5");           // successful response
  });

  const snsSubject = 'Captcha generating SUCCEED';

  // Create publish parameters for sns
  var sns_params = {
    Message: 'Success generating the captcha images',
    Subject: snsSubject,
    TopicArn: SNS_TOPIC_ARN
  };
  let sns = new AWS.SNS()

  //send failure message to sns
  sns.publish(sns_params, function (err, data) {
    if (err) {
      console.error(err, err.stack);
      callback(Error("failed to send sns message for success "));
    }
    else {
      const parameters = {
        parameters: {
          captchaGeneratingJob: {},
        },
      };
      callback(null,parameters);
    }
  });


}
