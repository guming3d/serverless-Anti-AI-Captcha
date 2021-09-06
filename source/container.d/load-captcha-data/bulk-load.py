import argparse
import logging
import subprocess
import os
from os import environ
from pathlib import Path

logger = logging.getLogger()
logger.setLevel(logging.DEBUG)

parser = argparse.ArgumentParser(description='Bulk load captcha data to S3 and DynamoDB.')

ddbName = environ['CAPTCHA_DDB_NAME']
captchaNumber = environ['CAPTCHA_NUMBER']
region = environ['REGION_NAME']

logger.info(f'Prepared captcha data for bulk load...')
logger.info("DDB table name is "+ddbName)
logger.info("Captcha number is "+captchaNumber)
logger.info("region name is "+region)

prepareDataCmd=Path(os.path.abspath(__file__)).parent.joinpath('prepare-data.sh')
dataArgs = ['captcha-generator-buckets-812669741844-cn-north-1',
            '2021/09/06/',
            ddbName,
            captchaNumber,
            region]

subprocess.check_call([prepareDataCmd] + list(dataArgs))
