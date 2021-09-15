# aws-gcr-solutions-intelligent-captcha

## How to use?

First use "aws configure" to update the aws credentials then type following commands
```shell
$ cd source
$ npm i
$ cdk synthesize
$ cdk deploy --parameters MaxDailyCaptchaNumber=1000 -c vpcId=vpc-9761e3fe

```

## How to cdk synth/diff/deploy?

```shell
$ npm run synth
$ npm run diff
$ npm run deploy
$ npm run deploy -- --parameters Param1=Value1 --parameters Param2=Value2
```

## How to format your code?

```shell
$ npm run eslint
```

## How to release?

```shell
$ # https://github.com/conventional-changelog/standard-version#release-as-a-target-type-imperatively-npm-version-like
$ npm run bump -- --release-as minor # major, minor or patch
$ # or
$ npm run bump -- --release-as 1.1.0
$ # dryrun
$ npm run bump -- --dry-run --release-as 1.1.0
$ # push tag to remote
$ git push origin v1.1.0
```
