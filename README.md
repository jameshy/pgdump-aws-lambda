# pgdump-aws-lambda

[![Build Status](https://travis-ci.org/jameshy/pgdump-aws-lambda.svg?branch=master)](https://travis-ci.org/jameshy/pgdump-aws-lambda)
[![Coverage Status](https://coveralls.io/repos/github/jameshy/pgdump-aws-lambda/badge.svg?branch=master)](https://coveralls.io/github/jameshy/pgdump-aws-lambda?branch=master)
[![npm version](https://badge.fury.io/js/pgdump-aws-lambda.svg)](https://badge.fury.io/js/pgdump-aws-lambda)

# Overview

An AWS Lambda function that runs pg_dump and streams the output to s3.

It can be configured to run periodically using CloudWatch events.

## Quick start

1. Create an AWS lambda function:
    - Runtime: Node.js 6.10
    - Code entry type: Upload a .ZIP file
    ([pgdump-aws-lambda.zip](https://github.com/jameshy/pgdump-aws-lambda/releases/download/v1.1.1/pgdump-aws-lambda.zip))
    - Configuration -> Advanced Settings
        - Timeout = 5 minutes
        - Select a VPC and security group (must be suitable for connecting to the target database server)
2. Create a CloudWatch rule:
    - Event Source: Fixed rate of 1 hour
    - Targets: Lambda Function (the one created in step #1)
    - Configure input -> Constant (JSON text) and paste your config, e.g.:
    ```json
    {
        "PGDATABASE": "oxandcart",
        "PGUSER": "staging",
        "PGPASSWORD": "uBXKFecSKu7hyNu4",
        "PGHOST": "database.com",
        "S3_BUCKET" : "my-db-backups",
        "ROOT": "hourly-backups"
    }
    ```

Note: you can test the lambda function using the "Test" button and providing config like above.

**AWS lambda has a 5 minute maximum execution time for lambda functions, so your backup must take less time that that.**

## File Naming

This function will store your backup with the following s3 key:

s3://${S3_BUCKET}${ROOT}/YYYY-MM-DD/YYYY-MM-DD@HH-mm-ss.backup

## PostgreSQL version compatibility

This script uses the pg_dump utility from PostgreSQL 9.6.2.

It should be able to dump older versions of PostgreSQL. I will try to keep the included  binaries in sync with the latest from postgresql.org, but PR or message me if there is a newer PostgreSQL binary available.

## Encryption

You can pass the config option 'ENCRYPTION_PASSWORD' and the backup will be encrypted using aes-256-ctr algorithm.

Example config:
```json
{
    "PGDATABASE": "dbname",
    "PGUSER": "postgres",
    "PGPASSWORD": "password",
    "PGHOST": "localhost",
    "S3_BUCKET" : "my-db-backups",
    "ENCRYPTION_PASSWORD": "my-secret-password"
}
```

To decrypt these dumps, use the command:
`openssl aes-256-ctr -d -in ./encrypted-db.backup  -nosalt -out unencrypted.backup`

## Loading your own `pg_dump` binary
1. Spin up an Amazon AMI image on EC2 (since the lambda function will run
   on Amazon AMI image, based off of CentOS, using it would have the
best chance of being compatible)
2. Install PostgreSQL using yum.  You can install the latest version from the [official repository](https://yum.postgresql.org/repopackages.php#pg96).
3. Add a new directory for your pg_dump binaries: `mkdir bin/postgres-9.5.2`
3. Copy the binaries
 - `scp -i YOUR-ID.pem ec2-user@AWS_IP:/usr/bin/pg_dump ./bin/postgres-9.5.2/pg_dump`
 - `scp -i YOUR-ID.pem ec2-user@AWS_UP:/usr/lib64/libpq.so.5.8 ./bin/postgres-9.5.2/libpq.so.5`
4. When calling the handler, pass the env variable PGDUMP_PATH=postgres-9.5.2 to use the binaries in the bin/postgres-9.5.2 directory.

NOTE: `libpq.so.5.8` is found out by running `ll /usr/lib64/libpq.so.5`
and looking at where the symlink goes to.

## Contributions

Please submit issues and PRs.
