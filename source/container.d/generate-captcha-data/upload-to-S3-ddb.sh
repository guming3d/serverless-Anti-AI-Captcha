#!/bin/bash -x
set -o errexit

export PATH=/opt/awscli/:$PATH

main() {
  check_args "$@"
  local s3BucketName=$1
  local currentDate=$2
  local targetDDBTableName=$3
  local captchaNumber=$4
  local regionName=$5
  local captchaImageDirectory=$6

#  export WORK_DIR=`mktemp -d --suffix '-captcha-data' -p "$tmpFolder"`

#  if [[ ! "$WORK_DIR" || ! -d "$WORK_DIR" ]]; then
#    echo "Could not create temp dir under $tmpFolder"
#    exit 1
#  fi

#  DATA_DIR="$WORK_DIR"/captcha-data
#  mkdir -p "$DATA_DIR"

  TOMORROW_DATE=$(date -v+1d '+%Y%m%d')
  YEAR=$(date -v+1d '+%Y')
  MONTH=$(date -v+1d '+%m')
  DAY=$(date -v+1d '+%d')
  S3_PREFIX="${YEAR}/${MONTH}/${DAY}/"
#  x=$captchaNumber;
#  while [ $x -gt 0 ];
#  do
#    tmpName=`sed "s/[^a-zA-Z0-9]//g" <<< $(openssl rand -base64 17)`
#    touch ${DATA_DIR}/$CURRENT_DATE-${tmpName}-RESULTSTRING.png
#    x=$(($x-1));
#  done

  trap cleanup EXIT

  #Copy the generated Captcha to S3
  targetS3Path="s3://${s3BucketName}/${S3_PREFIX}"
  targetS3HttpPath="https://${s3BucketName}.s3.${regionName}.amazonaws.com.cn/${s3PrefixName}"
  echo "target s3 path is ${targetS3Path}"
  echo "target s3 http path is ${targetS3HttpPath}"
  aws s3 cp ${captchaImageDirectory} ${targetS3Path} --recursive

  #Generating DDB from the s3 captcha file
  j=0
  for item in `aws s3 ls ${targetS3Path}|awk '{print $4}'`
  do
      result=`echo $item|awk -F- '{print $3}'|awk -F. '{print $1}'`
      echo "result of $item is $result"
      #create DDB record for this captcha file
      aws dynamodb put-item \
          --table-name $targetDDBTableName \
          --item "{  \"captcha_date\": {\"S\": \"${TOMORROW_DATE}\"},  \"captcha_index\": {\"N\": \"${j}\"}, \"captchaUrl\": {\"S\": \"${targetS3HttpPath}${item}\"}, \"result\": {\"S\": \"${result}\"} }" --return-consumed-capacity TOTAL
      	j=$((j+1));
      	echo $j
  done

}
#
# deletes the temp directory
function cleanup {
  rm -rf "$WORK_DIR"
  echo "Deleted temp working directory $WORK_DIR"
}

# Makes sure that we provided (from the cli)
# enough arguments.
check_args() {
  if (($# != 6)); then
    echo "Error:
    Three arguments must be provided - $# provided.
    Usage:
      $0 <target bucket path> <target DDB table name> <totalCaptcha number> <region name> <directory name>
Aborting."
    exit 1
  fi
}

# Run the entry point with the CLI arguments
# as a list of words as supplied.
main "$@"
