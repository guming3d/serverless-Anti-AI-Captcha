/* eslint-disable no-undef */

exports.handler = async (event, context) => {

  console.log("succeed");

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/plain' },
    body: 'Succeed'
  };
};
