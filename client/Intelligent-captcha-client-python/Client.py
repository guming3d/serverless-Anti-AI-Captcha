import requests
from aws_requests_auth.boto_utils import BotoAWSRequestsAuth

# example
# auth = BotoAWSRequestsAuth(
#                        aws_host='so0ub2tsdf.execute-api.cn-northwest-1.amazonaws.com.cn',
#                        aws_region='cn-northwest-1',
#                        aws_service='execute-api')
# please replace "aws_host" and "aws_region" accordingly
auth = auth = BotoAWSRequestsAuth(
                       aws_host='{API_GATEWAY_ENDPOINT_WITHOUT_HTTPS}',
                       aws_region='{AWS_REGION}',
                       aws_service='execute-api')

# example
# response = requests.get('https://so0ub2tsdf.execute-api.cn-northwest-1.amazonaws.com.cn/prod/captcha',
#                         auth=auth)
response = requests.get('{API_GATEWAY_ENDPOINT}',
                        auth=auth)

print(response.content)
