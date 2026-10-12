const { S3Client } = require('@aws-sdk/client-s3')
const { Upload } = require('@aws-sdk/lib-storage')

async function uploadS3(stream, config, key) {
    // Construct S3 client with logger
    const s3 = new S3Client({
        region: config.S3_REGION,
        logger: process.stdout
    })
    // Use lib-storage Upload for multipart upload
    const upload = new Upload({
        client: s3,
        params: {
            Key: key,
            Bucket: config.S3_BUCKET,
            Body: stream,
            StorageClass: config.S3_STORAGE_CLASS
        },
        partSize: config.S3_PART_SIZE,
        queueSize: 1
    })
    const result = await upload.done()

    console.log('Uploaded to', result.Location)
    return result.Location
}

module.exports = uploadS3
