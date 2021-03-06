import argparse
import logging
import subprocess
import datetime
import os
from os import environ
from pathlib import Path
"""
This script is created to call Machine Learning generated Captcha
It is only wrapper to call captcha_main.py to generate the captcha png files
and call upload-to-S3-ddb.sh to upload the generated captcha files to S3 and
inserted to ddb
"""
parser = argparse.ArgumentParser(description='Bulk load captcha data to S3 and DynamoDB.')

ddbName = environ['CAPTCHA_DDB_NAME']
captchaNumber = environ['CAPTCHA_NUMBER']
region = environ['REGION_NAME']
s3BucketName = environ['S3_BUCKET_NAME']
target_date = environ['TARGET_DATE']

print("Prepared captcha data for bulk load...")
print("DDB table name is "+ddbName)
print("Captcha number is "+captchaNumber)
print("region name is "+region)
print("s3 bucket name is "+s3BucketName)
print("target date is "+target_date)

currentDate = target_date

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

subprocess.check_call(list(dataArgs))

dynamoDBGenerator=Path(os.path.abspath(__file__)).parent.joinpath('upload-to-S3-ddb.sh')
dataArgs2 = [s3BucketName,
            currentDate,
            ddbName,
            captchaNumber,
            region,
            '/app/data/captcha_images/']

subprocess.check_call([dynamoDBGenerator] + list(dataArgs2))




