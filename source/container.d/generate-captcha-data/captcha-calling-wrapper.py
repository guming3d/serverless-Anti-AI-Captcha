import argparse
import logging
import subprocess
import datetime
import os
from os import environ
from pathlib import Path

logger = logging.getLogger()
logger.setLevel(logging.DEBUG)

parser = argparse.ArgumentParser(description='Bulk load captcha data to S3 and DynamoDB.')

ddbName = environ['CAPTCHA_DDB_NAME']
captchaNumber = environ['CAPTCHA_NUMBER']
region = environ['REGION_NAME']
s3BucketName = environ['S3_BUCKET_NAME']

logger.info(f'Prepared captcha data for bulk load...')
logger.info("DDB table name is "+ddbName)
logger.info("Captcha number is "+captchaNumber)
logger.info("region name is "+region)
logger.info("s3 bucket name is "+s3BucketName)

currentDate = datetime.date.today().strftime("%Y/%m/%d/")
logger.info("today is "+currentDate)

captchaFactory=Path(os.path.abspath(__file__)).parent.joinpath('python /app/captcha_main.py')
dataArgs = [s3BucketName,
            currentDate,
            ddbName,
            captchaNumber,
            region]

subprocess.check_call([captchaFactory] + list(dataArgs))

dynamoDBGenerator=Path(os.path.abspath(__file__)).parent.joinpath('upload-to-s3.sh')
dataArgs = [s3BucketName,
            currentDate,
            ddbName,
            captchaNumber,
            region]

subprocess.check_call([captchaFactory] + list(dataArgs))




