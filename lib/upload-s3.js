const AWS = require('aws-sdk')

// configure AWS to log to stdout
AWS.config.update({
    logger: process.stdout
})

async function uploadS3(stream, config, key) {
    const s3 = new AWS.S3({
        region: config.S3_REGION
    })
    const result = await s3.upload({
        Key: key,
        Bucket: config.S3_BUCKET,
        Body: stream
    }).promise()

    console.log('Uploaded to', result.Location)
    return result.Location
}

module.exports = uploadS3
