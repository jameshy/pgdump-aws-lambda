# pgdump-aws-lambda

# Overview

A simple AWS Lambda function that runs pg_dump and streams the output to s3.

Using AWS, you can schedule it to run periodically.


# Instructions

1. Create an AWS lambda function using the [zip](https://github.com/jameshy/pgdump-aws-lambda/releases/download/v0.0.2/pgdump-aws-lambda.zip) as "function package".
2. Add a "CloudWatch Events - Schedule" trigger.
3. In the 'rule', setup your schedule and configure the lamba input to something like:
```json
{
    "PGHOST": "database.myserver.com",
    "PGUSER": "my-user",
    "PGPASSWORD": "my-password",
    "PGDATABASE": "my-database-name",
    "S3_BUCKET": "my-s3-backup-bucket",
    "SUBKEY": "production"
}
```

# File Naming

This function will store your backup with the following s3 key:

s3://${S3_BUCKET}/${SUBKEY}/YYYY-MM-DD/YYYY-MM-DD@HH-mm-ss.backup

# Loading your own `pg_dump` binary
1. spin up Amazon AMI image on EC2 (since the lambda function will run
   on Amazon AMI image, based off of CentOS, using it would have the
best chance of being compatiable)
2. install postgres as normal (current default version is 9.5, but you can find
   packages on the official postgres site for 9.6)
3. run `scp -i YOUR-ID.pem ec2-user@AWS_IP:/usr/bin/pg_dump ./bin/` and `scp -i YOUR-ID.pem ec2-user@AWS_UP:/usr/lib64/libpq.so.5.8 ./bin/libpq.so.5`

NOTE: `libpq.so.5.8` is found out by running `ll /usr/lib64/libpq.so.5`
and looking at where the symlink goes to.

