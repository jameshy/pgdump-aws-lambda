const AWS = require('aws-sdk')

// configure AWS to log to stdout
AWS.config.update({
    logger: process.stdout
})

module.exports = function (stream, config, key) {
    if (!stream || typeof stream.on !== 'function') {
        throw new Error('invalid stream provided')
    }

    console.log(
        'streaming dump to s3 '
        + `bucket=${config.S3_BUCKET}, `
        + `key=${key} `
        + `region=${config.S3_REGION}`
    )

    const s3 = new AWS.S3({
        region: config.S3_REGION
    })
    return s3.upload({
        Key: key,
        Bucket: config.S3_BUCKET,
        Body: stream
    }).promise()
        .then((result) => {
            console.log('Uploaded the backup to', result.Location)
            return result.Location
        })
}
