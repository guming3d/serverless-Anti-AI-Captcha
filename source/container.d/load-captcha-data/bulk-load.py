import argparse
import logging
import subprocess
import os
from pathlib import Path

logger = logging.getLogger()
logger.setLevel(logging.DEBUG)

parser = argparse.ArgumentParser(description='Bulk load captcha data to S3 and DynamoDB.')

logger.info(f'Prepared captcha data for bulk load...')

prepareDataCmd=Path(os.path.abspath(__file__)).parent.joinpath('prepare-data.sh')
dataArgs = ['captcha-generator-buckets-812669741844-cn-north-1',
            '2021/09/06/',
            'IntelligentCaptchaStack-Captchaindex33A2C8CB-5LZ9XYOO7BLM',
            '100',
            'cn-north-1']

subprocess.check_call([prepareDataCmd] + list(dataArgs))
