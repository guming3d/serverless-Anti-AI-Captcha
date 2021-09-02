import argparse
import logging
import subprocess
import os
from pathlib import Path

logger = logging.getLogger()
logger.setLevel(logging.DEBUG)

parser = argparse.ArgumentParser(description='Bulk load captcha data to S3 and DynamoDB.')

logger.info(f'Prepared graph data for bulk load...')

prepareDataCmd=Path(os.path.abspath(__file__)).parent.joinpath('prepare-data.sh')
subprocess.check_call([prepareDataCmd])
