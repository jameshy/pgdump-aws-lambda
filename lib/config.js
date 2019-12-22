const path = require('path')

module.exports = {
    S3_REGION: 'eu-west-1',
    PGDUMP_PATH: path.join(__dirname, '../bin/postgres-11.6')
}
