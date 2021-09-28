/* eslint-disable no-undef */

exports.failureHandler = function (event, context, callback) {

  console.debug(`Receiving captcha generating failure event`);
  console.debug(JSON.stringify(event, null, 2));

  const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;
  // Load the AWS SDK for Node.js
  let AWS = require('aws-sdk');

  // Set the region
  AWS.config.update({region: process.env.AWS_REGION});

  const snsSubject = 'Captcha generating FAILED';

  // Create publish parameters for sns
  var params = {
    Message: JSON.stringify(event, null, 2),
    Subject: snsSubject,
    TopicArn: SNS_TOPIC_ARN
  };
  let sns = new AWS.SNS()

  //send failure message to sns
  sns.publish(params, function (err, data) {
    if (err) {
      console.error(err, err.stack);
      callback(Error("failed to send sns message"));
    } // an error occurred when sending sns message
    else {
      callback(Error("failed to generate the captcha"));
    }
  });
}
