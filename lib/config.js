const path = require('path')

module.exports = {
    S3_REGION: 'eu-west-1',
    PGDUMP_PATH: path.join(__dirname, '../bin/postgres-11.6'),
    // maximum time allowed to connect to postgres before a timeout occurs
    PGCONNECT_TIMEOUT: 15
}
