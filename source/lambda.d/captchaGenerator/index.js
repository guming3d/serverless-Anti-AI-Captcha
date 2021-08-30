/* eslint-disable no-undef */


exports.handler =  function(event, context, callback) {

  // Load the AWS SDK for Node.js
  var AWS = require('aws-sdk');

  // Set the region
  AWS.config.update({region: process.env.AWS_REGION});

  // Create the DynamoDB service object
  var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});


  //get current date\
  function dateFormat (date, fstr, utc) {
    utc = utc ? 'getUTC' : 'get';
    return fstr.replace (/%[Ymd]/g, function (m) {
      switch (m) {
        case '%Y': return date[utc + 'FullYear'] (); // no leading zeros required
        case '%m': m = 1 + date[utc + 'Month'] (); break;
        case '%d': m = date[utc + 'Date'] (); break;
        default: return m.slice (1); // unknown code, remove %
      }
      // add leading zero if required
      return ('0' + m).slice (-2);
    });
  }
  var currentDate = dateFormat(new Date (), "%Y%m%d", false);
  console.log("guming debug>> current date is " + currentDate);

  //get a random index from 1 to MAXINDEX
  MAXINDEX = 20;
  random = function(min, max){
    return Math.floor(Math.random() * (max - min + 1) + min)
  }

  console.log(
    random(0, MAXINDEX-1)
  )
  var params = {
    TableName: 'IntelligentCaptchaStack-Captchaindex33A2C8CB-5LZ9XYOO7BLM',
    Key: {
      'date': {S: currentDate},
      'index': {N: random(0, MAXINDEX-1).toString() }
    },
    ProjectionExpression: 'ATTRIBUTE_NAME'
  };


  ddb.getItem(params, function(err, data) {
    if (err) {
      console.log("GuMing debug>> Error", err);
      callback(Error(err));
    } else {
      console.log("GuMing debug>> Success", data);
      callback(null,
        {
          statusCode: 200,
          headers: { 'Content-Type': 'text/plain' },
          body: "Succeed get the captcha"
        });
    }
  });
};
