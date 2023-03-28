# pgdump-aws-lambda

[![Build Status](https://travis-ci.org/jameshy/pgdump-aws-lambda.svg?branch=master)](https://travis-ci.org/jameshy/pgdump-aws-lambda)
[![Coverage Status](https://coveralls.io/repos/github/jameshy/pgdump-aws-lambda/badge.svg?branch=master)](https://coveralls.io/github/jameshy/pgdump-aws-lambda?branch=master)

An AWS Lambda function that runs pg_dump and streams the output to s3.

It can be configured to run periodically using CloudWatch events.

## Quick start

1. Create an AWS lambda function:
    - Author from scratch
    - Runtime: Node.js 16.x
    - Architecture: x86_64
2. tab "Code" -> "Upload from" -> ".zip file":
    - Upload ([pgdump-aws-lambda.zip](https://github.com/jameshy/pgdump-aws-lambda/releases/latest))
    - tab "Configuration" -> "General Configuration" -> "Edit"
        - Timeout: 15 minutes
        - Edit the role and attach the policy "AmazonS3FullAccess"
    - Save
3. Give your lambda permissions permissions to write to S3:

    - tab "Configuration" -> "Permissions"
    - click the existing Execution role
    - "Add permissions" -> "Attach policies"
    - select "AmazonS3FullAccess" and click "Attach policies"

4. Test

    - Create new test event, e.g.:

    ```json
    {
        "PGDATABASE": "dbname",
        "PGUSER": "postgres",
        "PGPASSWORD": "password",
        "PGHOST": "host",
        "S3_BUCKET": "db-backups",
        "ROOT": "hourly-backups"
    }
    ```

    - _Test_ and check the output

5. Create a CloudWatch rule:
    - Event Source: Schedule -> Fixed rate of 1 hour
    - Targets: Lambda Function (the one created in step #1)
    - Configure input -> Constant (JSON text) and paste your config (as per previous step)

#### File Naming

This function will store your backup with the following s3 key:

s3://${S3_BUCKET}${ROOT}/YYYY-MM-DD/YYYY-MM-DD@HH-mm-ss.backup

#### AWS Firewall

-   If you run the Lambda function outside a VPC, you must enable public access to your database instance, a non VPC Lambda function executes on the public internet.
-   If you run the Lambda function inside a VPC, you must allow access from the Lambda Security Group to your database instance. Also you must either add a NAT gateway ([chargeable](https://aws.amazon.com/vpc/pricing/)) to your VPC so the Lambda can connect to S3 over the Internet, or add an [S3 VPC endpoint (free)](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html) and allow traffic to the appropriate S3 prefixlist.

#### Encryption

You can add an encryption key to your event, e.g.

```json
{
    "PGDATABASE": "dbname",
    "PGUSER": "postgres",
    "PGPASSWORD": "password",
    "PGHOST": "host",
    "S3_BUCKET": "db-backups",
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

#### S3 Upload Part Size

If you experience lamba timeouts while uploading file parts to S3 you can try increasing the part size of each file chunk (might need to increase lambda resources). For instance on a 2GB file using the default part size of 5MB would result on ~400 parts, pushing all this parts was exceeding the 15min timeout for lambdas, by increasing the part size to 1GB the transmit time was reduced to ~3 mintes.

```json
{
    "S3_PART_SIZE": 1073741824,
}
```

#### IAM-based Postgres authentication

Your context may require that you use IAM-based authentication to log into the Postgres service.
Support for this can be enabled my making your Cloudwatch Event look like this.

```json
{
    "PGDATABASE": "dbname",
    "PGUSER": "postgres",
    "PGHOST": "host",
    "S3_BUCKET": "db-backups",
    "ROOT": "hourly-backups",
    "USE_IAM_AUTH": true
}
```

If you supply `USE_IAM_AUTH` with a value of `true`, the `PGPASSWORD` var may be omitted in the CloudWatch event.
If you still provide it, it will be ignored.

#### SecretsManager-based Postgres authentication

If you prefer to not send DB details/credentials in the event parameters, you can store such details in SecretsManager and just provide the SecretId, then the function will fetch your DB details/credentials from the secret value.

NOTE: the execution role for the Lambda function must have access to GetSecretValue for the given secret.

Support for this can be enabled by setting the SECRETS_MANAGER_SECRET_ID, so your Cloudwatch Event looks like this:

```json
{
    "SECRETS_MANAGER_SECRET_ID": "my/secret/id",
    "S3_BUCKET": "db-backups",
    "ROOT": "hourly-backups"
}
```

If you supply `SECRETS_MANAGER_SECRET_ID`, you can ommit the 'PG\*' keys, and they will be fetched from your SecretsManager secret value instead with the following mapping:

| Secret Value | PG-Key     |
| ------------ | ---------- |
| username     | PGUSER     |
| password     | PGPASSWORD |
| dbname       | PGDATABASE |
| host         | PGHOST     |
| port         | PGPORT     |

You can provide overrides in your event to any PG\* keys as event parameters will take precedence over secret values.

## Developer

#### Bundling a new `pg_dump` binary

1. Launch an EC2 instance with the Amazon Linux 2 AMI
2. Connect via SSH and:

```bash

# install postgres 15
sudo amazon-linux-extras install epel

sudo tee /etc/yum.repos.d/pgdg.repo<<EOF
[pgdg15]
name=PostgreSQL 15 for RHEL/CentOS 7 - x86_64
baseurl=https://download.postgresql.org/pub/repos/yum/15/redhat/rhel-7-x86_64
enabled=1
gpgcheck=0
EOF

sudo yum install postgresql15 postgresql15-server

exit
```

#### Download the binaries

```bash
scp ec2-user@your-ec2-hostname:/usr/bin/pg_dump ./bin/postgres-15.0/pg_dump
scp ec2-user@your-ec2-hostname:/usr/lib64/{libcrypt.so.1,libnss3.so,libsmime3.so,libssl3.so,libsasl2.so.3,liblber-2.4.so.2,libldap_r-2.4.so.2} ./bin/postgres-15.0/
scp ec2-user@your-ec2-hostname:/usr/pgsql-15/lib/libpq.so.5 ./bin/postgres-15.0/libpq.so.5
```

3. To use the new postgres binary pass PGDUMP_PATH in the event:

```json
{
    "PGDUMP_PATH": "bin/postgres-15.0"
}
```

#### Creating a new function zip

`npm run makezip`

#### Contributing

Please submit issues and PRs.
