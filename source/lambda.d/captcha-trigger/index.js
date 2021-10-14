// asset-input/lambda.d/captcha-trigger/index.js
exports.triggerHandler = function(event, context, callback) {
  console.debug(`Receiving captcha generating event.`);
  let AWS = require("aws-sdk");
  AWS.config.update({ region: process.env.AWS_REGION });
  let ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });
  let ddbtablename = process.env.DDB_TABLE_NAME;
  let params = {
    TableName: ddbtablename,
    ProvisionedThroughput: {
      WriteCapacityUnits: 50,
      ReadCapacityUnits: 50
    }
  };
  ddb.updateTable(params, function(err, data) {
    if (err) {
      console.error(err, err.stack);
      callback(Error("failed to update the write capacity unit of dynamodb to 50"));
    } else
      console.debug("Succeed update the write capacity unit to 50");
  });

  console.log("input is "+JSON.stringify(event, null, 2));
  let targetDate = '';
  if('target_date' in event){
    targetDate = event.target_date;
    console.log("target date exist: "+JSON.stringify(event.target_date, null, 2));
  }else{
    console.log("target date parameter not exist, will generate captcha for second day of current date");
  }
  const parameters = {
    parameters: {
      captchaGeneratingJob: {},
      target_date: targetDate
    }
  };
  callback(null, parameters);
};
