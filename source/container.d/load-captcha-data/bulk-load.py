import logging
import argparse

logger = logging.getLogger()
logger.setLevel(logging.INFO)

parser = argparse.ArgumentParser(description='Bulk load captcha data to S3 and DynamoDB.')

print('GUMING DEBUG>>Captcha Bulk load request is completed.')
# parser.add_argument('--data_prefix', help='s3 object prefix for uploading graph data')
# parser.add_argument('--temp_folder', help='temp folder for processing the data')
# parser.add_argument('--region', help='the region of CaptchaGenerator is running')
# parser.add_argument('--CaptchaGenerator_iam_role_arn', help='arn of iam role of CaptchaGenerator for loading data')
#
# args = parser.parse_args()
#
# modelS3Url = urlparse(environ['MODEL_PACKAGE'], allow_fragments=False)
# originModelArtifact = f's3:/{modelS3Url.path}'
# graphDataUrl = urlparse(environ['GRAPH_DATA_PATH'], allow_fragments=False)
# graphDataPath = f's3:/{graphDataUrl.path}/graph/'
# targetDataPath = f"{args.data_prefix}/{environ['JOB_NAME']}"
# tempFolder = args.temp_folder
#
# dataArgs = (originModelArtifact, graphDataPath, targetDataPath, tempFolder)
#
# prepareDataCmd=Path(os.path.abspath(__file__)).parent.joinpath('prepare-data.sh')
# logger.info(f"| {prepareDataCmd} {' '.join(dataArgs)}")
# subprocess.check_call([prepareDataCmd] + list(dataArgs))
# logger.info(f'Prepared graph data for bulk load...')
#
# endpoints = Endpoints(CaptchaGenerator_endpoint=args.CaptchaGenerator_endpoint, CaptchaGenerator_port=args.CaptchaGenerator_port, region_name=args.region)
#
# logger.info(f'Created CaptchaGenerator endpoint ${endpoints.gremlin_endpoint()}.')
#
# bulkload = BulkLoad(
#         source=targetDataPath,
#         endpoints=endpoints,
#         role=args.CaptchaGenerator_iam_role_arn,
#         region=args.region,
#         update_single_cardinality_properties=True,
#         fail_on_error=True)
#
# load_status = bulkload.load_async()
# logger.info(f'Bulk load request from {targetDataPath} is submmitted.')
#
# status, json = load_status.status(details=True, errors=True)
# logger.info(f"Bulk load status is {json}...")
#
# load_status.wait()
logger.info('Captcha Bulk load request is completed.')
print('Captcha Bulk load request is completed.')
