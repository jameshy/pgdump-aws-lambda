const Promise = require('bluebird')
const utils = require('./utils')
const encryption = require('./encryption')
// todo: make these const, (mockSpawn doesn't allow this, so remove mockSpawn)
const uploadS3 = require('./upload-s3')
const pgdump = require('./pgdump')

const DEFAULT_CONFIG = require('./config')

function handler(event) {
    const config = { ...DEFAULT_CONFIG, ...event }

    if (!config.PGDATABASE) {
        throw new Error('PGDATABASE not provided in the event data')
    }
    if (!config.S3_BUCKET) {
        throw new Error('S3_BUCKET not provided in the event data')
    }

    // determine the path for the database dump
    const key = utils.generateBackupPath(
        config.PGDATABASE,
        config.ROOT
    )

    const pgdumpProcess = pgdump(config)
    return pgdumpProcess
        .then(readableStream => {
            if (config.ENCRYPTION_PASSWORD) {
                console.log('encrypting dump')
                readableStream = encryption.encrypt(
                    readableStream,
                    config.ENCRYPTION_PASSWORD
                )
            }
            // stream to s3 uploader
            return uploadS3(readableStream, config, key)
        })
        .catch(e => {
            throw e
        })
}

module.exports = function (event, context, cb) {
    return Promise.try(() => handler(event, context))
        .then(result => {
            cb(null)
            return result
        })
        .catch(err => {
            cb(err)
            throw err
        })
}
