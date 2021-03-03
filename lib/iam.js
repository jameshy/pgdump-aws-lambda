const AWS = require('aws-sdk')

function decorateWithIamToken(baseConfig) {
    const rdsSigner = new AWS.RDS.Signer()
    const token = rdsSigner.getAuthToken({
        hostname: baseConfig.PGHOST,
        port: baseConfig.PGPORT != null ? baseConfig.PGPORT : 5432,
        region: baseConfig.S3_REGION,
        username: baseConfig.PGUSER
    })
    return { ...baseConfig, PGPASSWORD: token }
}

module.exports = decorateWithIamToken
