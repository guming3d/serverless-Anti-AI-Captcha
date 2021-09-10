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

# captchaFactory=Path(os.path.abspath(__file__)).parent.joinpath('python /app/captcha_main.py')
# captcha_main.py --customer_name test_account --encrypted_name b6ec0e74e15bb1f7aabe793a5173fd02 --num_per_char 10 --num_captcha_image 10
dataArgs = [
            'python',
            '/app/captcha_main.py',
            '--customer_name',
            'test_account',
            '--encrypted_name',
            'b6ec0e74e15bb1f7aabe793a5173fd02',
            '--num_per_char',
            '10',
            '--num_captcha_image',
            captchaNumber,
            '--is_regenerate_char',
            '1'
            ]

# subprocess.check_call([captchaFactory] + list(dataArgs))
subprocess.check_call(list(dataArgs))

dynamoDBGenerator=Path(os.path.abspath(__file__)).parent.joinpath('upload-to-s3-ddb.sh')
dataArgs = [s3BucketName,
            currentDate,
            ddbName,
            captchaNumber,
            region,
            '/app/data/captcha_images/']

subprocess.check_call([dynamoDBGenerator] + list(dataArgs))




