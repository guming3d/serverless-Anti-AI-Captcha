***How to use***
1. install aws_requests_auth python lib
2. Update the config section in Client.java
```python2html
  auth = BotoAWSRequestsAuth(
                       aws_host='{API_GATEWAY_ENDPOINT_WITHOUT_HTTPS}', #example: so0ub2tsdf.execute-api.cn-northwest-1.amazonaws.com.cn
                       aws_region='{AWS_REGION}', #example: cn-northwest-1
                       aws_service='execute-api')//for example https://234n34k5678k.execute-api.eu-west-1.amazonaws.com
```
3. Run Client.py, if success, will get the captcha result from api-gateway as below:
```angular2html
{"captchaUrl":{"S":"https://captcha-generator-buckets-065717342743-cn-northwest-1.s3.cn-northwest-1.amazonaws.com.cn/2021/09/16/1679467359828166917_c995722ad514df5e319964be62723e14.png"},"captcha_date":{"S":"20210916"},"ExpirationTime":{"N":"1632384686"},"result":{"S":"890"},"captcha_index":{"N":"53"}}

Process finished with exit code 0
```
