const { RDSAuth } = require('@aws-sdk/rds-signer')

async function decorateWithIamToken(baseConfig) {
    const signer = new RDSAuth({
        region: baseConfig.S3_REGION
    })

    const token = await signer.getAuthToken({
        hostname: baseConfig.PGHOST,
        port: baseConfig.PGPORT != null ? baseConfig.PGPORT : 5432,
        username: baseConfig.PGUSER
    })
    return { ...baseConfig, PGPASSWORD: token }
}

module.exports = decorateWithIamToken
