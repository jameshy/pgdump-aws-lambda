/* eslint-disable brace-style */
const { SecretsManager } = require("@aws-sdk/client-secrets-manager");

async function getDbCredentials(config) {
    const secretsManager = new SecretsManager({
        region: config.S3_REGION,
        logger: process.stdout,
    });

    const params = {
        SecretId: config.SECRETS_MANAGER_SECRET_ID
    }

    return new Promise((resolve, reject) => {
        secretsManager.getSecretValue(params, (err, data) => {
            if (err) {
                console.log('Error while getting secret value:', err)
                reject(err)
            } else {
                const credentials = JSON.parse(data.SecretString)
                resolve(credentials)
            }
        })
    })
}

async function decorateWithSecretsManagerCredentials(baseConfig) {
    try {
        const credentials = await getDbCredentials(baseConfig)

        const credsFromSecret = {}

        if (credentials.username) credsFromSecret.PGUSER = credentials.username
        if (credentials.password) credsFromSecret.PGPASSWORD = credentials.password
        if (credentials.dbname) credsFromSecret.PGDATABASE = credentials.dbname
        if (credentials.host) credsFromSecret.PGHOST = credentials.host
        if (credentials.port) credsFromSecret.PGPORT = credentials.port

        return {
            ...credsFromSecret,
            ...baseConfig
        }
    } catch (error) {
        console.log(error)
        return baseConfig
    }
}

module.exports = decorateWithSecretsManagerCredentials
