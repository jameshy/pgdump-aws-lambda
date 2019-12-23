const utils = require('./utils')
const uploadS3 = require('./upload-s3')
const pgdump = require('./pgdump')

const DEFAULT_CONFIG = require('./config')

async function handler(event) {
    const config = { ...DEFAULT_CONFIG, ...event }

    if (!config.PGDATABASE) {
        throw new Error('PGDATABASE not provided in the event data')
    }
    if (!config.S3_BUCKET) {
        throw new Error('S3_BUCKET not provided in the event data')
    }

    const key = utils.generateBackupPath(
        config.PGDATABASE,
        config.ROOT
    )

    // spawn the pg_dump process and stream the backup to S3
    const readableStream = await pgdump(config)
    return uploadS3(readableStream, config, key)
}

module.exports = handler
