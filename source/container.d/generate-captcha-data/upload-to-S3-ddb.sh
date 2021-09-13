#!/bin/bash -x
set -o errexit

# This script is created to upload generated captcha images to s3 and
# create corresponding records in dynamoDB

export PATH=/opt/awscli/:$PATH

main() {
  check_args "$@"
  local s3BucketName=$1
  local currentDate=$2
  local targetDDBTableName=$3
  local captchaNumber=$4
  local regionName=$5
  local captchaImageDirectory=$6

  TOMORROW_DATE=$(date --date="next day" '+%Y%m%d')
  YEAR=$(date --date="next day" '+%Y')
  MONTH=$(date --date="next day" '+%m')
  DAY=$(date --date="next day" '+%d')
  S3_PREFIX="${YEAR}/${MONTH}/${DAY}/"

  EPOCH_TOMORROW=$(date --date="next day" '+%s')
  EPOCH_EXPIRE_DATE=$((EPOCH_TOMORROW + 604800))


  trap cleanup EXIT

  #Copy the generated Captcha to S3
  targetS3Path="s3://${s3BucketName}/${S3_PREFIX}"
  targetS3HttpPath="https://${s3BucketName}.s3.${regionName}.amazonaws.com.cn/${S3_PREFIX}"
  echo "target s3 path is ${targetS3Path}"
  echo "target s3 http path is ${targetS3HttpPath}"
  aws s3 cp ${captchaImageDirectory} ${targetS3Path} --recursive --acl public-read --exclude "*" --include "*.png"

  #Generating DDB from the s3 captcha file, using batch-write to increase the performance
  j=0
  fileIndex=0
  FILENAME="/tmp/captcha_cache"
  for item in `aws s3 ls ${targetS3Path}|awk '{print $4}'`
  do
      resultFileName=`echo $item|awk -F. '{print $1}'`
      result=`cat ${captchaImageDirectory}${resultFileName}.txt`
      echo "result of $item is $result"
      tmp=$((j%20))
      echo "tmp is $tmp"
      if [[ $tmp -eq 19 ]]; then
        #use batch write to ddb
        echo "{ \
            \"PutRequest\": \
               { \
                \"Item\":     \
                {  \
                  \"captcha_date\": {\"S\": \"${TOMORROW_DATE}\"},  \
                  \"captcha_index\": {\"N\": \"${j}\"}, \
                  \"ExpirationTime\": {\"N\": \"${EPOCH_EXPIRE_DATE}\"}, \
                  \"captchaUrl\": {\"S\": \"${targetS3HttpPath}${item}\"}, \
                  \"result\": {\"S\": \"${result}\"} \
                } \
               } \
              } \
              " >>$FILENAME${fileIndex}.json

              echo " ] \
              }" >>$FILENAME${fileIndex}.json

              #using batch write to dynamodb
              n=0
              until [ "$n" -ge 3 ]
              do
                 aws dynamodb batch-write-item --request-items file://$FILENAME${fileIndex}.json && break  # substitute your command here
                 n=$((n+1))
                 echo "dynamodb been throttled and retry $n time"
                 sleep 200
              done

         fileIndex=$((fileIndex+1))
        tmp=$((tmp+1))

      else
        if [[ $tmp -eq 0 ]]; then
          echo "{ \
                  \"$targetDDBTableName\": [ ">>$FILENAME${fileIndex}.json
        fi
        echo "{ \
            \"PutRequest\": \
               { \
                \"Item\":     \
                {  \
                  \"captcha_date\": {\"S\": \"${TOMORROW_DATE}\"},  \
                  \"captcha_index\": {\"N\": \"${j}\"}, \
                  \"ExpirationTime\": {\"N\": \"${EPOCH_EXPIRE_DATE}\"}, \
                  \"captchaUrl\": {\"S\": \"${targetS3HttpPath}${item}\"}, \
                  \"result\": {\"S\": \"${result}\"} \
                } \
               } \
              }, \
                " >>$FILENAME${fileIndex}.json
         tmp=$((tmp+1))
      fi
      j=$((j+1));
      echo $j
  done

}

# deletes the temp directory
function cleanup {
  rm -rf "$captchaImageDirectory"
  echo "Deleted temp working directory $captchaImageDirectory"
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
