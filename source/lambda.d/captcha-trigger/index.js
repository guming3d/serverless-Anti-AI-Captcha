/* eslint-disable no-undef */

// const {ParametersOutput} = require("./index");
exports.triggerHandler = function (event, context, callback) {

  console.debug(`Receiving captcha generating event.`);

  //increase the write capacity to 2000
  // Load the AWS SDK for Node.js
  let AWS = require('aws-sdk');

  // Set the region
  AWS.config.update({region: process.env.AWS_REGION});

  // Create the DynamoDB service object
  let ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
  let ddbtablename = process.env.DDB_TABLE_NAME
  let params = {
    TableName: ddbtablename,
    ProvisionedThroughput: {
      WriteCapacityUnits: 2000,
      ReadCapacityUnits: 200
    },
  };

  ddb.updateTable(params, function (err, data) {
    if (err) {
      console.error(err, err.stack);
      callback(Error("failed to update the write capacity unit of dynamodb to 2000"));
    } // an error occurred
      else console.debug("Succeed update the write capacity unit to 2000");           // successful response
  });

  const parameters = {
    parameters: {
      captchaGeneratingJob: {},
    },
  };
  callback(null,parameters);
}
