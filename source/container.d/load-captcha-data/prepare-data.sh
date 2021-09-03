#!/bin/bash -x
set -o errexit

export PATH=/opt/awscli/:$PATH

main() {
  export WORK_DIR=`mktemp -d --suffix '-captcha-data' -p "$tmpFolder"`

  if [[ ! "$WORK_DIR" || ! -d "$WORK_DIR" ]]; then
    echo "Could not create temp dir under $tmpFolder"
    exit 1
  fi
  DATA_DIR="$WORK_DIR"/captcha-data
  mkdir -p "$DATA_DIR"
  CURRENT_DATE=$(date '+%Y%m%d')
  x=100;
  while [ $x -gt 0 ];
  do
    tmpName=`sed "s/[^a-zA-Z0-9]//g" <<< $(openssl rand -base64 17)`
    touch ${DATA_DIR}/$CURRENT_DATE-${tmpName}-RESULTSTRING.png
    x=$(($x-1));
  done

  trap cleanup EXIT

  check_args "$@"
  local targetS3Path=$1
  local targetDDBTableName=$2
  #Copy the generated Captcha to S3
  aws s3 cp ${DATA_DIR} ${targetS3Path} --recursive

  #Generating DDB from the s3 captcha file
  j=0
  for item in `aws s3 ls s3://captcha-generator-buckets-812669741844-cn-north-1/2021/08/30/|awk '{print $4}'`
  do
      result=`echo $item|awk -F- '{print $3}'`
      echo "result of $item is $result"
      #create DDB record for this captcha file
      aws dynamodb put-item \
          --table-name $targetDDBTableName \
          --item "{  \"date\": {\"S\": \"${CURRENT_DATE}\"},  \"index\": {\"N\": \"${j}\"}, \"captchaUrl\": {\"S\": \"https://captcha-generator-buckets-812669741844-cn-north-1.s3.cn-north-1.amazonaws.com.cn/2021/08/30/${item}\"}, \"result\": {\"S\": \"${result}\"} }" --return-consumed-capacity TOTAL
      	j=$((j+1));
      	echo $j
  done





#  local origin_model=$1
#  local graph_data_path=$2
#  local target_path=$3
#  local tmpFolder=$4
#
#
#
#  trap cleanup EXIT
#
#  aws s3 cp $origin_model $WORK_DIR/model.tar.gz
#  mkdir -p "$DATA_DIR"
#  tar -xvf "$WORK_DIR"/model.tar.gz -C "$DATA_DIR" --wildcards '*.csv'
#  aws s3 cp --recursive "$DATA_DIR" "$target_path"
#
#  aws s3 sync "$graph_data_path" "$target_path"
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
  if (($# != 2)); then
    echo "Error:
    Three arguments must be provided - $# provided.
    Usage:
      $0 <target bucket path> <target DDB table name>
Aborting."
    exit 1
  fi
}

# Run the entry point with the CLI arguments
# as a list of words as supplied.
main "$@"
