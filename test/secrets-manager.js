/* eslint no-underscore-dangle: 0 */
const { expect } = require('chai')
const rewire = require('rewire')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const AWSMOCK = require('aws-sdk-mock')
const AWS = require('aws-sdk')

chai.should()
chai.use(chaiAsPromised)

AWSMOCK.setSDKInstance(AWS)

const decorateWithSecretsManagerCredentials = rewire('../lib/secrets-manager')

describe('secrets-manager-based auth', () => {
    const parsedSecretValue = {
        dbname: 'somedatabase',
        username: 'someuser',
        password: 'somepassword',
        host: 'somehost',
        port: '2345'
    }
    const secretValue = {
        SecretString: JSON.stringify(parsedSecretValue)
    }

    const keyMappings = [
        { secretKey: 'username', pgKey: 'PGUSER' },
        { secretKey: 'password', pgKey: 'PGPASSWORD' },
        { secretKey: 'dbname', pgKey: 'PGDATABASE' },
        { secretKey: 'host', pgKey: 'PGHOST' },
        { secretKey: 'port', pgKey: 'PGPORT' }
    ]

    keyMappings.forEach((map) => {
        it(`should set ${map.pgKey} from the secret ${map.secretKey}`, async () => {
            const mockEvent = { SECRETS_MANAGER_SECRET_ID: 'my-secret-id' }

            AWSMOCK.mock('SecretsManager', 'getSecretValue', (params, callback) => {
                expect(params.SecretId).to.eql(mockEvent.SECRETS_MANAGER_SECRET_ID)

                callback(null, secretValue)
            })

            const config = await decorateWithSecretsManagerCredentials(mockEvent)

            expect(config[map.pgKey]).to.eql(parsedSecretValue[map.secretKey])
        })

        context(`when the event contains an override for ${map.pgKey}`, () => {
            it(`should set ${map.pgKey} from the event params`, async () => {
                const mockEvent = {
                    SECRETS_MANAGER_SECRET_ID: 'my-secret-id',
                    [map.pgKey]: 'some-value-override'
                }

                AWSMOCK.mock('SecretsManager', 'getSecretValue', (params, callback) => {
                    expect(params.SecretId).to.eql(mockEvent.SECRETS_MANAGER_SECRET_ID)

                    callback(null, secretValue)
                })

                const config = await decorateWithSecretsManagerCredentials(mockEvent)

                expect(config[map.pgKey]).to.eql(mockEvent[map.pgKey])
            })
        })
    })

    context('when there is an error getting the secret value', () => {
        it('should return the given base config', async () => {
            const mockEvent = { SECRETS_MANAGER_SECRET_ID: 'my-secret-id' }

            AWSMOCK.mock('SecretsManager', 'getSecretValue', (params, callback) => {
                expect(params.SecretId).to.eql(mockEvent.SECRETS_MANAGER_SECRET_ID)

                callback('some error', secretValue)
            })

            const config = await decorateWithSecretsManagerCredentials(mockEvent)

            expect(config).to.eql(mockEvent)
        })
    })

    afterEach(() => {
        AWSMOCK.restore('SecretsManager')
    })
})
