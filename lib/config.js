const path = require('path')

// default config that is overridden by the Lambda event
module.exports = {
    S3_REGION: 'eu-west-1',
    PGDUMP_PATH: path.join(__dirname, '../bin/postgres-13.3'),
    // maximum time allowed to connect to postgres before a timeout occurs
    PGCONNECT_TIMEOUT: 15,
    USE_IAM_AUTH: false
}
