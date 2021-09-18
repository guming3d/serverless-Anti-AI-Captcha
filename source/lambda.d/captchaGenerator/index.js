/* eslint-disable no-undef */

exports.handler = function (event, context, callback) {

  // Load the AWS SDK for Node.js
  let AWS = require('aws-sdk');

  // Set the region
  AWS.config.update({region: process.env.AWS_REGION});

  // Create the DynamoDB service object
  let ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

  //get current date with yyyymmdd format
  function dateFormat(date, fstr, utc) {
    utc = utc ? 'getUTC' : 'get';
    return fstr.replace(/%[Ymd]/g, function (m) {
      switch (m) {
        case '%Y':
          return date[utc + 'FullYear'](); // no leading zeros required
        case '%m':
          m = 1 + date[utc + 'Month']();
          break;
        case '%d':
          m = date[utc + 'Date']();
          break;
        default:
          return m.slice(1); // unknown code, remove %
      }
      // add leading zero if required
      return ('0' + m).slice(-2);
    });
  }

  //Convert to local timezone
  function convertTZ(date, tzString) {
    return new Date((typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", {timeZone: tzString}));
  }

  let curDate = new Date();
  let convertedDate = convertTZ(curDate, "Asia/Shanghai")
  let currentDateStr = dateFormat(convertedDate, "%Y%m%d", false);
  console.debug("current date is " + currentDateStr);

  //get a random index from 1 to MAXINDEX
  const MAXINDEX = process.env.MAX_DAILY_INDEX;
  let random = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
  }

  let ddbtablename = process.env.DDB_TABLE_NAME
  let params = {
    TableName: ddbtablename,
    Key: {
      'captcha_date': {S: currentDateStr},
      'captcha_index': {N: random(0, MAXINDEX - 1).toString()}
    }
  };

  ddb.getItem(params, function (err, data) {
    if (err) {
      console.error("Failed to get DDB record with error:", err);
      callback(Error(err));
    } else {
      if (data.Item == null) {
        console.debug("failed to get the record from dynamodb will try to get the record from previous day");

        let previousDate = curDate;
        previousDate.setDate(previousDate.getDate() - 1);
        convertedDate = convertTZ(previousDate, "Asia/Shanghai");
        let previousDateStr = dateFormat(convertedDate, "%Y%m%d", false);
        console.debug("fallback date is ", previousDateStr);

        params = {
          TableName: ddbtablename,
          Key: {
            'captcha_date': {S: previousDateStr},
            'captcha_index': {N: random(0, MAXINDEX - 1).toString()}
          }
        };
        ddb.getItem(params, function (err, data) {
          if (err) {
            console.error("Failed to get DDB record with error:", err);
            callback(Error(err));
          } else {
            if (data.Item == null) {
              callback(Error("failed to get the record from dynamodb with date:"+previousDateStr));
            } else {
              console.debug("result is ", JSON.stringify(data));
              callback(null,
                {
                  statusCode: 200,
                  headers: {'Content-Type': 'text/plain'},
                  body: JSON.stringify(data.Item)
                });
            }
          }
        });

      } else {
        console.debug("result is ", JSON.stringify(data));
        callback(null,
          {
            statusCode: 200,
            headers: {'Content-Type': 'text/plain'},
            body: JSON.stringify(data.Item)
          });
      }
    }
  });
};
