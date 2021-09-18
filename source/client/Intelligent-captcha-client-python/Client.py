import requests
from aws_requests_auth.aws_auth import AWSRequestsAuth

auth = AWSRequestsAuth(aws_access_key='{YOUR_ACCESS_KEY}',
                       aws_secret_access_key='{YOUR_SECRET_ACCESS_KEY}',
                       aws_host='{API_GATEWAY_ENDPOINT_WITHOUT_HTTPS}', #example: so0ub2tsdf.execute-api.cn-northwest-1.amazonaws.com.cn
                       aws_region='{AWS_REGION}', #example: cn-northwest-1
                       aws_service='execute-api')
# auth = AWSRequestsAuth(aws_access_key='AKIAQ6TIPCIXXCTGJUXR',
#                        aws_secret_access_key='HfRmQwit/dfXXXXbfr/eF+qjXs42vMWmHJKj7Qy',
#                        aws_host='so0ub2tsdf.execute-api.cn-northwest-1.amazonaws.com.cn',
#                        aws_region='cn-northwest-1',
#                        aws_service='execute-api')

# example
# response = requests.get('https://so0ub2tsdf.execute-api.cn-northwest-1.amazonaws.com.cn/captcha',
#                         auth=auth)
response = requests.get('{API_GATEWAY_ENDPOINT}',
                        auth=auth)

print(response.content)