const utils = require('./utils')
const uploadS3 = require('./upload-s3')
const pgdump = require('./pgdump')
const encryption = require('./encryption')
const AWS = require('aws-sdk')

const DEFAULT_CONFIG = require('./config')

async function backup(config) {
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

    // spawn the pg_dump process
    let stream = await pgdump(config)
    if (config.ENCRYPT_KEY && encryption.validateKey(config.ENCRYPT_KEY)) {
        // if encryption is enabled, we generate an IV and store it in a separate file
        const iv = encryption.generateIv()
        const ivKey = key + '.iv'

        await uploadS3(iv.toString('hex'), config, ivKey)
        stream = encryption.encrypt(stream, config.ENCRYPT_KEY, iv)
    }
    // stream the backup to S3
    return uploadS3(stream, config, key)
}

function decorateWithIamToken(baseConfig) {
    const rdsSigner = new AWS.RDS.Signer()
    const token = rdsSigner.getAuthToken({
        hostname: baseConfig.PGHOST,
        port: baseConfig.PGPORT != null ? baseConfig.PGPORT : 5432,
        region: baseConfig.S3_REGION,
        username: baseConfig.PGUSER
    })
    return Object.assign(baseConfig, { PGPASSWORD: token })
}

async function handler(event) {
    const baseConfig = { ...DEFAULT_CONFIG, ...event }
    const config = event.USE_IAM_AUTH === true ? decorateWithIamToken(baseConfig) : baseConfig
    try {
        return await backup(config)
    }
    catch (error) {
        // log the error and rethrow for Lambda
        if (process.env.NODE_ENV !== 'test') {
            console.error(error)
        }
        throw error
    }
}

module.exports = handler
