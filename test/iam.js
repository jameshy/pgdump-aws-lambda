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


const decorateWithIamToken = rewire('../lib/iam')

describe('iam-based auth', () => {
    it('should set the postgres default if no PGPORT is set', async () => {
        const mockEvent = { USE_IAM_AUTH: true }
        const token = 'foo'
        AWSMOCK.mock('RDS.Signer', 'getAuthToken', (options) => {
            expect(options.port).to.equal(5432)
            return token
        })
        decorateWithIamToken(mockEvent)
    })

    it('should apply PGPORT to the auth-token request', async () => {
        const mockEvent = { USE_IAM_AUTH: true, PGPORT: 2345 }
        const token = 'foo'
        AWSMOCK.mock('RDS.Signer', 'getAuthToken', (options) => {
            expect(options.port).to.equal(mockEvent.PGPORT)
            return token
        })
        decorateWithIamToken(mockEvent)
    })

    afterEach(() => {
        AWSMOCK.restore('RDS.Signer')
    })
})
