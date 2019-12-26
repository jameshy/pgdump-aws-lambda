const AWS = require('aws-sdk')

// configure AWS to log to stdout
AWS.config.update({
    logger: process.stdout
})

module.exports = function (stream, config, key) {
    const s3 = new AWS.S3({
        region: config.S3_REGION
    })
    return s3.upload({
        Key: key,
        Bucket: config.S3_BUCKET,
        Body: stream
    }).promise()
        .then((result) => {
            console.log('Uploaded to', result.Location)
            return result.Location
        })
}
