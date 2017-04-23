const utils = require('./utils')
var uploadS3 = require('./upload-s3')
var pgdump = require('./pgdump')

const DEFAULT_CONFIG = {
    S3_REGION: 'eu-west-1'
}

module.exports = function (event, context, cb) {
    const config = Object.assign({}, DEFAULT_CONFIG, event)

    if (!config.PGDATABASE) {
        return cb('PGDATABASE not provided in the event data')
    }
    if (!config.S3_BUCKET) {
        return cb('S3_BUCKET not provided in the event data')
    }

    // determine the path for the database dump
    const key = utils.generateBackupPath(
        config.PGDATABASE,
        config.ROOT
    )

    // spawn pg_dump process
    const pgdumpProcess = pgdump(config)

    return pgdumpProcess
    .then(readableStream => {
        // stream to s3 uploader
        return uploadS3(readableStream, config, key)
        .then(() => {
            cb(null)
        })
    })
    .catch(e => {
        console.error(e)
    })
}
// const event = {
//     PGDATABASE: 'postgres',
//     PGUSER: 'postgres',
//     S3_BUCKET: 'oxandcart-db-backups',
//     ROOT: 'test'
// }
// module.exports(event, {}, result => {
//     console.log('handler finishsed', result)
// })
