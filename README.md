# pgdump-aws-lambda

Forked from https://github.com/jameshy/pgdump-aws-lambda

An AWS Lambda function that runs pg_dump and streams the output to s3.

Currently this function is deployed only on our development environment. 

## Setup

The function receives the following JSON input from EventBridge:

    ```
    {
        "PGDATABASE": "tia",
        "PGUSER": "tiadevelopment",
        "PGHOST": "rds-read-replica-development.crwg9lms4h1h.us-west-2.rds.amazonaws.com",
        "S3_BUCKET" : "rds-dev-dumps",
        "ROOT": "daily-backups"
    }
    ```

ROOT stands for the S3 folder that the dump will be placed on.
The database password is passed as a environment variable on the lambda console.

*Disclaimer:* You may notice that the function has support for iam authentication on the database, but our database settings does not allow iam auth, that's why we pass the password as an env var.

## Schedule

The function runs once a day at 00:00 UTC

To modify the schedule, go to the function UI, click EventBridge and modify the rule.

## Dumps lifecycle

On the S3 bucket there is a lifecycle rule that will delete objects older than 30 days.

## Modifying and Deploying

There is no CI/CD for this function.

If you want to modify the code, clone this repository locally, make your changes and then run:

`npm run deploy`

This command will generate a .zip file under dist/ folder.

Now upload the .zip on the lambda console, tab "Code" -> "Upload from" -> ".zip file"