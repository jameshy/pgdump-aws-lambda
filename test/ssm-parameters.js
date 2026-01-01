const { expect } = require('chai')
const AWSMOCK = require('aws-sdk-mock')
const AWS = require('aws-sdk')
const decorateWithSsmParameters = require('../lib/ssm-parameters')

describe('decorateWithSsmParameters', () => {
    before(() => {
        AWSMOCK.setSDKInstance(AWS)
    })

    afterEach(() => {
        AWSMOCK.restore('SSM')
    })

    it('should merge SSM parameter values into config', async () => {
        AWSMOCK.mock('SSM', 'getParameters', (params, cb) => {
            cb(null, {
                Parameters: [
                    { Name: '/my/app/PGUSER', Value: 'bar' },
                    { Name: '/my/app/PGPASSWORD', Value: 'qux' }
                ],
                InvalidParameters: []
            })
        })
        const baseConfig = { SSM_PARAMETER_NAMES: ['/my/app/PGUSER', '/my/app/PGPASSWORD'], someOther: 'value' }
        const result = await decorateWithSsmParameters(baseConfig)
        expect(result).to.deep.equal({ PGUSER: 'bar', PGPASSWORD: 'qux', SSM_PARAMETER_NAMES: ['/my/app/PGUSER', '/my/app/PGPASSWORD'], someOther: 'value' })
    })

    it('should allow event fields to override SSM values', async () => {
        AWSMOCK.mock('SSM', 'getParameters', (params, cb) => {
            cb(null, {
                Parameters: [
                    { Name: '/my/app/PGUSER', Value: 'bar' }
                ],
                InvalidParameters: []
            })
        })
        const baseConfig = { SSM_PARAMETER_NAMES: ['/my/app/PGUSER'], PGUSER: 'override' }
        const result = await decorateWithSsmParameters(baseConfig)
        expect(result.PGUSER).to.equal('override')
    })

    it('should return baseConfig if no SSM_PARAMETER_NAMES', async () => {
        const baseConfig = { PGUSER: 'user' }
        const result = await decorateWithSsmParameters(baseConfig)
        expect(result).to.deep.equal(baseConfig)
    })

    it('should return baseConfig on SSM error', async () => {
        AWSMOCK.mock('SSM', 'getParameters', (params, cb) => {
            cb(new Error('fail'))
        })
        const baseConfig = { SSM_PARAMETER_NAMES: ['foo'] }
        const result = await decorateWithSsmParameters(baseConfig)
        expect(result).to.deep.equal(baseConfig)
    })

    it('should return baseConfig if any requested SSM parameter is missing', async () => {
        AWSMOCK.mock('SSM', 'getParameters', (params, cb) => {
            cb(null, {
                Parameters: [
                  { Name: '/my/app/PGUSER', Value: 'bar' }
                ],
                InvalidParameters: []
            })
        })
        // PGUSER will be found, PGPASSWORD will be missing
        const baseConfig = { SSM_PARAMETER_NAMES: ['/my/app/PGUSER', '/my/app/PGPASSWORD'] }
        const result = await decorateWithSsmParameters(baseConfig)
        expect(result).to.deep.equal(baseConfig)
    })
})
