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

  TOMORROW_DATE=$(date --date="next day" '+%Y%m%d')
  YEAR=$(date --date="next day" '+%Y')
  MONTH=$(date --date="next day" '+%m')
  DAY=$(date --date="next day" '+%d')
  S3_PREFIX="${YEAR}/${MONTH}/${DAY}/"

  trap cleanup EXIT

  #Copy the generated Captcha to S3
  targetS3Path="s3://${s3BucketName}/${S3_PREFIX}"
  targetS3HttpPath="https://${s3BucketName}.s3.${regionName}.amazonaws.com.cn/${S3_PREFIX}"
  echo "target s3 path is ${targetS3Path}"
  echo "target s3 http path is ${targetS3HttpPath}"
  aws s3 cp ${captchaImageDirectory} ${targetS3Path} --recursive --acl public-read

  #Generating DDB from the s3 captcha file
  j=0
  for item in `aws s3 ls ${targetS3Path}|awk '{print $4}'`
  do
      encrypted_result=`echo $item|awk -F_ '{print $2}'|awk -F. '{print $1}'`

      #decrypt the result using the user key
      result=`python -c "import utils as util ;key = bytes.fromhex(\"f0eeb0d35c0b014bb7141e80b9089e7e\"); text = util.decrypt_fn( key, \"${encrypted_result}\"); print(text)"`
      echo "result of $item is $result"
      #create DDB record for this captcha file
      aws dynamodb put-item \
          --table-name $targetDDBTableName \
          --item "{  \"captcha_date\": {\"S\": \"${TOMORROW_DATE}\"},  \"captcha_index\": {\"N\": \"${j}\"}, \"captchaUrl\": {\"S\": \"${targetS3HttpPath}${item}\"}, \"result\": {\"S\": \"${result}\"} }" --return-consumed-capacity TOTAL
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
