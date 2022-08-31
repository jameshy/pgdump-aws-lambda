const path = require('path')

// default config that is overridden by the Lambda event
module.exports = {
    S3_REGION: 'us-west-2',
    PGDUMP_PATH: path.join(__dirname, '../bin/postgres-13.3'),
    // maximum time allowed to connect to postgres before a timeout occurs
    PGCONNECT_TIMEOUT: 10,
    USE_IAM_AUTH: false,
    PGPASSWORD: process.env.PGPASSWORD
}
