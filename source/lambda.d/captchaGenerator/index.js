/* eslint-disable no-undef */


exports.handler =  function(event, context, callback) {

  // Load the AWS SDK for Node.js
  let AWS = require('aws-sdk');

  // Set the region
  AWS.config.update({region: process.env.AWS_REGION});

  // Create the DynamoDB service object
  let ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

  //get current date with yyyymmdd format
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

  //Convert to local timezone
  function convertTZ(date, tzString) {
    return new Date((typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", {timeZone: tzString}));
  }
  const convertedDate = convertTZ(new Date(),"Asia/Shanghai")

  let currentDate = dateFormat(convertedDate, "%Y%m%d", false);
  console.debug("current date is " + currentDate);

  //get a random index from 1 to MAXINDEX
  const MAXINDEX = process.env.MAX_DAILY_INDEX;
  let random = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
  }

  console.debug(
    random(0, MAXINDEX-1)
  )

  let ddbtablename = process.env.DDB_TABLE_NAME
  let params = {
    TableName: ddbtablename,
    Key: {
      'captcha_date': {S: currentDate},
      'captcha_index': {N: random(0, MAXINDEX-1).toString() }
    }
  };

  ddb.getItem(params, function(err, data) {
    if (err) {
      console.error("Failed to get DDB record with error:", err);
      callback(Error(err));
    } else {
      console.debug("captchaUrl is ", data.Item.captchaUrl.S);
      console.debug("result is ", data.Item.result.S);
      callback(null,
        {
          statusCode: 200,
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(data.Item)
        });
    }
  });
};
