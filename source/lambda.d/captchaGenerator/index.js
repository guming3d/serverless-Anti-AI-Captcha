/* eslint-disable no-undef */


exports.handler =  function(event, context, callback) {

  // Load the AWS SDK for Node.js
  let AWS = require('aws-sdk');

  // Set the region
  AWS.config.update({region: process.env.AWS_REGION});

  // Create the DynamoDB service object
  let ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});


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
  let currentDate = dateFormat(new Date (), "%Y%m%d", false);
  console.log("guming debug>> current date is " + currentDate);

  //get a random index from 1 to MAXINDEX
  const MAXINDEX = 20;
  let random = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
  }

  console.log(
    random(0, MAXINDEX-1)
  )
  let ddbtablename = process.env.DDB_TABLE_NAME
  let params = {
    TableName: ddbtablename,
    Key: {
      // 'date': {S: currentDate},
      'date': {S: '20210831'},
      'index': {N: random(0, MAXINDEX-1).toString() }
    }
  };


  ddb.getItem(params, function(err, data) {
    if (err) {
      console.log("GuMing debug>> Error", err);
      callback(Error(err));
    } else {
      console.log("GuMing debug>> captchaUrl is ", data.Item.captchaUrl.S);
      console.log("GuMing debug>> result is ", data.Item.result.S);
      callback(null,
        {
          statusCode: 200,
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(data.Item)
        });
    }
  });
};
