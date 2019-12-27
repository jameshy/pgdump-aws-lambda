const { expect } = require('chai')
const moment = require('moment')
const utils = require('../lib/utils')


describe('Utils', () => {
    describe('generateBackupPath', () => {
        it('should generate a correct path', () => {
            const databaseName = 'test-db'
            const now = moment('2017-04-22 15:01:02')
            const expected = '2017-04-22/test-db-22-04-2017@15-01-02.backup'
            const result = utils.generateBackupPath(databaseName, null, now)
            expect(result).to.equal(expected)
        })
    })
})
