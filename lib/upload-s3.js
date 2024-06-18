const { Upload } = require('@aws-sdk/lib-storage')
const { S3 } = require('@aws-sdk/client-s3')

async function uploadS3(stream, config, key) {
    const s3 = new S3({
        region: config.S3_REGION,
        logger: process.stdout
    })
    const result = await new Upload({
        client: s3,

        params: {
            Key: key,
            Bucket: config.S3_BUCKET,
            Body: stream,
            StorageClass: config.S3_STORAGE_CLASS
        }
    }).done()

    console.log('Uploaded to', result.Location)
    return result.Location
}

module.exports = uploadS3
