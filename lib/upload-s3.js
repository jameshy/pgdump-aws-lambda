const AWS = require('aws-sdk')

// configure AWS to log to stdout
AWS.config.update({
    logger: process.stdout
})

module.exports = function (stream, config, key) {
    if (!stream || typeof stream.on !== 'function') {
        throw new Error('invalid stream provided')
    }
    return new Promise((resolve, reject) => {
        console.log(
            'streaming dump to s3 ' +
            `bucket=${config.S3_BUCKET}, ` +
            `key=${key} ` +
            `region=${config.S3_REGION}`
        )
        const s3 = new AWS.S3({
            params: {
                Bucket: config.S3_BUCKET,
                Key: key,
                ACL: 'bucket-owner-full-control'
            }
        })

        // begin upload to s3
        s3.upload({
            Body: stream
        })
        .send((err, data) => {
            if (err) {
                reject(err)
            }
            else {
                console.log('Uploaded the backup to', data.Location)
                resolve(data.Location)
            }
        })
    })
}
