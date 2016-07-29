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
