# pgdump-aws-lambda

[![Build Status](https://travis-ci.org/jameshy/pgdump-aws-lambda.svg?branch=master)](https://travis-ci.org/jameshy/pgdump-aws-lambda)
[![Coverage Status](https://coveralls.io/repos/github/jameshy/pgdump-aws-lambda/badge.svg?branch=master)](https://coveralls.io/github/jameshy/pgdump-aws-lambda?branch=master)

An AWS Lambda function that runs pg_dump and streams the output to s3.

It can be configured to run periodically using CloudWatch events.

## Quick start

1. Create an AWS lambda function:
    - Author from scratch
    - Runtime: Node.js 12.x
2. Configuration -> Function code:
    - Code Entry Type: Upload a .zip file
        - Upload ([pgdump-aws-lambda.zip](https://github.com/jameshy/pgdump-aws-lambda/releases/latest))
    - Basic Settings -> Timeout: 15 minutes
    - Save
3. Configuration -> Execution role
    - Edit the role and attach the policy "AmazonS3FullAccess"
4. Test
    - Create new test event, e.g.:
    ```json
    {
        "PGDATABASE": "dbname",
        "PGUSER": "postgres",
        "PGPASSWORD": "password",
        "PGHOST": "host",
        "S3_BUCKET" : "db-backups",
        "ROOT": "hourly-backups"
    }
    ```
    - *Test* and check the output

5. Create a CloudWatch rule:
    - Event Source: Schedule -> Fixed rate of 1 hour
    - Targets: Lambda Function (the one created in step #1)
    - Configure input -> Constant (JSON text) and paste your config (as per step #4)


#### File Naming

This function will store your backup with the following s3 key:

s3://${S3_BUCKET}${ROOT}/YYYY-MM-DD/YYYY-MM-DD@HH-mm-ss.backup

#### Postgres Version

To run with Postgres 12.5 pass in the PGDUMP_PATH config option into the event:
```json
{
    "PGDUMP_PATH": "bin/postgres-12.5"
}
```

#### AWS Firewall

- If you run the Lambda function outside a VPC, you must enable public access to your database instance, a non VPC Lambda function executes on the public internet.
- If you run the Lambda function inside a VPC (not tested), you must allow access from the Lambda Security Group to your database instance. Also you must add a NAT gateway to your VPC so the Lambda can connect to S3.

#### Encryption

You can add an encryption key to your event, e.g.

```json
{
    "PGDATABASE": "dbname",
    "PGUSER": "postgres",
    "PGPASSWORD": "password",
    "PGHOST": "host",
    "S3_BUCKET" : "db-backups",
    "ROOT": "hourly-backups",
    "ENCRYPT_KEY": "c0d71d7ae094bdde1ef60db8503079ce615e71644133dc22e9686dc7216de8d0"
}
```

The key should be exactly 64 hex characters (32 hex bytes).

When this key is present the function will do streaming encryption directly from pg_dump -> S3.

It uses the aes-256-cbc encryption algorithm with a random IV for each backup file.
The IV is stored alongside the backup in a separate file with the .iv extension.

You can decrypt such a backup with the following bash command:

```bash
openssl enc -aes-256-cbc -d \
-in postgres-27-12-2019@13-19-13.backup \
-out postgres-27-12-2019@13-19-13.unencrypted.backup \
-K c0d71d7ae094bdde1ef60db8503079ce615e71644133dc22e9686dc7216de8d0 \
-iv $(< postgres-27-12-2019@13-19-13.backup.iv)
```

#### IAM-based Postgres authentication

Your context may require that you use IAM-based authentication to log into the Postgres service.
Support for this can be enabled my making your Cloudwatch Event look like this.

```json

{
     "PGDATABASE": "dbname",
     "PGUSER": "postgres",
     "USE_IAM_AUTH": true,
     "PGHOST": "host",
     "S3_BUCKET" : "db-backups",
     "ROOT": "hourly-backups"
}
```

If you supply `USE_IAM_AUTH` with a value of `true`, the `PGPASSWORD` var may be omitted in the CloudWatch event.
If you still provide it, it will be ignored.

## Developer

#### Bundling a new `pg_dump` binary
1. Launch an EC2 instance with the Amazon Linux 2 AMI
2. Connect via SSH and [Install PostgreSQL using yum](https://stackoverflow.com/questions/55798856/deploy-postgres11-to-elastic-beanstalk-requires-etc-redhat-release).
3. Locally, create a new directory for your pg_dump binaries: `mkdir bin/postgres-11.6`
3. Copy the binaries
 - `scp -i <aws PEM> ec2-user@<EC2 Instance IP>:/usr/bin/pg_dump ./bin/postgres-11.6/pg_dump`
 - `scp -i <aws PEM> ec2-user@<EC2 Instance IP>:/usr/lib64/{libcrypt.so.1,libnss3.so,libsmime3.so,libssl3.so,libsasl2.so.3,liblber-2.4.so.2,libldap_r-2.4.so.2} ./bin/postgres-11.6/`
 - `scp -i <aws PEM> ec2-user@<EC2 Instance IP>:/usr/pgsql-11/lib/libpq.so.5 ./bin/postgres-11.6/libpq.so.5`
4. When calling the handler, pass the environment variable `PGDUMP_PATH=postgres-11.6` to use the binaries in the bin/postgres-11.6 directory.

#### Creating a new function zip

`npm run deploy`

#### Contributing

Please submit issues and PRs.
