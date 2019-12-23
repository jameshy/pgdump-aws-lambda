# pgdump-aws-lambda

[![Build Status](https://travis-ci.org/jameshy/pgdump-aws-lambda.svg?branch=master)](https://travis-ci.org/jameshy/pgdump-aws-lambda)
[![Coverage Status](https://coveralls.io/repos/github/jameshy/pgdump-aws-lambda/badge.svg?branch=master)](https://coveralls.io/github/jameshy/pgdump-aws-lambda?branch=master)

# Overview

An AWS Lambda function that runs pg_dump and streams the output to s3.

It can be configured to run periodically using CloudWatch events.

## Quick start

1. Create an AWS lambda function:
    - Author from scratch
    - Runtime: Node.js 12.x
2. In *Function code*:
    - Code Entry Type: Upload a .zip file
        - Upload `pgdump-aws-lambda.zip`
    - Basic Settings -> Timeout: 15 minutes
    - Save
3. Code entry type: Upload a .ZIP file
    ([pgdump-aws-lambda.zip](https://github.com/jameshy/pgdump-aws-lambda/releases/download/v1.1.5/pgdump-aws-lambda.zip))
    - Configuration -> Advanced Settings
        - Timeout = 15 minutes
4. Create a CloudWatch rule:
    - Event Source: Fixed rate of 1 hour
    - Targets: Lambda Function (the one created in step #1)
    - Configure input -> Constant (JSON text) and paste your config, e.g.:
    ```json
    {
        "PGDATABASE": "dbname",
        "PGUSER": "postgres",
        "PGPASSWORD": "password",
        "PGHOST": "host",
        "S3_BUCKET" : "my-db-backups",
        "ROOT": "hourly-backups"
    }
    ```

**AWS lambda has a 15 minute maximum execution time for lambda functions, so your backup must take less time that that.**

## File Naming

This function will store your backup with the following s3 key:

s3://${S3_BUCKET}${ROOT}/YYYY-MM-DD/YYYY-MM-DD@HH-mm-ss.backup

## PostgreSQL version compatibility

This script uses the pg_dump utility from PostgreSQL 9.6.2.

It should be able to dump older versions of PostgreSQL. I will try to keep the included  binaries in sync with the latest from postgresql.org, but PR or message me if there is a newer PostgreSQL binary available.

## Bundling a `pg_dump` binary
1. Launch an EC2 instance with the Amazon Linux 2 AMI
2. Connect via SSH and (Install PostgreSQL using yum)[https://stackoverflow.com/questions/55798856/deploy-postgres11-to-elastic-beanstalk-requires-etc-redhat-release].
3. Locally, create a new directory for your pg_dump binaries: `mkdir bin/postgres-11.6`
3. Copy the binaries
 - `scp -i <aws PEM> ec2-user@<EC2 Instance IP>:/usr/bin/pg_dump ./bin/postgres-11.6/pg_dump`
 - `scp -i <aws PEM> ec2-user@<EC2 Instance IP>:/usr/lib64/{libcrypt.so.1,libnss3.so,libsmime3.so,libssl3.so,libsasl2.so.3,liblber-2.4.so.2,libldap_r-2.4.so.2} ./bin/postgres-11.6/`
 - `scp -i <aws PEM> ec2-user@<EC2 Instance IP>:/usr/pgsql-11/lib/libpq.so.5 ./bin/postgres-11.6/libpq.so.5`
4. When calling the handler, pass the environment variable `PGDUMP_PATH=postgres-11.6` to use the binaries in the bin/postgres-11.6 directory.

## Create a new function zip

`npm run deploy`

## Contributing

Please submit issues and PRs.
