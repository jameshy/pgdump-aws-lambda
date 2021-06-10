/* eslint no-underscore-dangle: 0 */
const { expect } = require('chai')
const rewire = require('rewire')
const sinon = require('sinon')
const mockDate = require('mockdate')
const mockSpawn = require('mock-spawn')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const AWSMOCK = require('aws-sdk-mock')
const AWS = require('aws-sdk')

AWSMOCK.setSDKInstance(AWS)
chai.should()
chai.use(chaiAsPromised)

const handler = rewire('../lib/handler')
const pgdump = require('../lib/pgdump')

describe('Handler', () => {
    function mockPgDumpSuccess() {
        const pgdumpProcess = mockSpawn()()
        pgdumpProcess.stdout.write('asdfasdf')
        pgdumpProcess.emit('close', 0)
        return Promise.resolve(pgdumpProcess.stdout)
    }
    function mockS3UploadSuccess(stream, config, key) {
        return Promise.resolve('mock-uploaded/' + key)
    }

    function makeMockHandler({ mockPgdump, mockS3upload } = {}) {
        mockPgdump = mockPgdump || mockPgDumpSuccess
        mockS3upload = mockS3upload || mockS3UploadSuccess
        const s3Spy = sinon.spy(mockS3upload)
        const pgSpy = sinon.spy(mockPgdump)
        handler.__set__('pgdump', pgSpy)
        handler.__set__('uploadS3', s3Spy)
        return {
            s3Spy,
            pgSpy
        }
    }

    const mockEvent = {
        PGDATABASE: 'dbname',
        S3_BUCKET: 's3bucket'
    }
    // mock dates, so we can test the backup file name
    mockDate.set('2017-05-02T01:33:11Z')

    it('should upload a backup', async () => {
        const { s3Spy, pgSpy } = makeMockHandler()

        const result = await handler(mockEvent)

        // handler should have called pgSpy with correct arguments
        expect(pgSpy.calledOnce).to.be.true
        expect(pgSpy.firstCall.args).to.have.length(1)
        const [arg0] = pgSpy.firstCall.args
        expect(arg0.S3_BUCKET).to.equal(mockEvent.S3_BUCKET)
        expect(arg0.PGDATABASE).to.equal(mockEvent.PGDATABASE)

        // handler should have called s3spy with correct arguments
        expect(s3Spy.calledOnce).to.be.true
        expect(s3Spy.firstCall.args).to.have.length(3)
        const [stream, config, key] = s3Spy.firstCall.args
        expect(stream).to.be.ok
        expect(config.S3_BUCKET).to.equal(mockEvent.S3_BUCKET)
        expect(config.PGDATABASE).to.equal(mockEvent.PGDATABASE)
        expect(key).to.equal('2017-05-02/dbname-02-05-2017@01-33-11.backup')
        expect(result).to.equal(
            'mock-uploaded/2017-05-02/dbname-02-05-2017@01-33-11.backup'
        )
    })

    it('should be able to authenticate via IAM ', async () => {
        const { s3Spy, pgSpy } = makeMockHandler()

        const iamMockEvent = { ...mockEvent, USE_IAM_AUTH: true }
        const token = 'foo'
        AWSMOCK.mock('RDS.Signer', 'getAuthToken', token)
        await handler(iamMockEvent)
        // handler should have called pgSpy with correct arguments
        expect(pgSpy.calledOnce).to.be.true
        expect(s3Spy.calledOnce).to.be.true
        expect(s3Spy.firstCall.args).to.have.length(3)
        const config = s3Spy.firstCall.args[1]
        // production code is synchronous, so this is annoying
        expect(await config.PGPASSWORD.promise()).to.equal(token)
        AWSMOCK.restore('RDS.Signer')
    })

    it('should upload the backup file and an iv file', async () => {
        const { s3Spy } = makeMockHandler()

        const event = {
            ...mockEvent,
            ENCRYPT_KEY:
            '4141414141414141414141414141414141414141414141414141414141414141'
        }

        const result = await handler(event)

        // handler should have called s3spy with correct arguments
        expect(s3Spy.calledTwice).to.be.true
        expect(s3Spy.firstCall.args).to.have.length(3)

        // first call is the IV
        const [stream, config, key] = s3Spy.firstCall.args
        expect(stream).to.have.length(32)
        expect(config.S3_BUCKET).to.equal(mockEvent.S3_BUCKET)
        expect(config.PGDATABASE).to.equal(mockEvent.PGDATABASE)
        expect(key).to.be.a.string
        expect(key).to.not.be.empty
        expect(key).to.equal('2017-05-02/dbname-02-05-2017@01-33-11.backup.iv')

        // second call is the backup
        const [stream2, config2, key2] = s3Spy.secondCall.args
        expect(stream2).to.be.ok
        expect(config2.S3_BUCKET).to.equal(mockEvent.S3_BUCKET)
        expect(config2.PGDATABASE).to.equal(mockEvent.PGDATABASE)
        expect(key2).to.equal('2017-05-02/dbname-02-05-2017@01-33-11.backup')

        // handler should return the backup path
        expect(result).to.equal(
            'mock-uploaded/2017-05-02/dbname-02-05-2017@01-33-11.backup'
        )
    })

    it('should throw an error when PGDATABASE is not provided', () => {
        makeMockHandler()
        const event = { ...mockEvent }
        event.PGDATABASE = undefined

        return handler(event)
            .should.be.rejectedWith(
                /PGDATABASE not provided in the event data/
            )
    })

    it('should throw an error when S3_BUCKET is not provided', () => {
        makeMockHandler()
        const event = { ...mockEvent }
        event.S3_BUCKET = undefined

        return handler(event)
            .should.be.rejectedWith(
                /S3_BUCKET not provided in the event data/
            )
    })

    it('should handle pgdump errors correctly', () => {
        const pgdumpWithErrors = () => {
            const pgdumpProcess = mockSpawn()()
            pgdumpProcess.stderr.write('-error')
            pgdumpProcess.emit('close', 1)
            return pgdumpProcess
        }

        makeMockHandler({
            mockPgdump: () => pgdump(mockEvent, pgdumpWithErrors)
        })

        return handler(mockEvent)
            .should.be.rejectedWith(
                /pg_dump gave us an unexpected response/
            )
    })
})
