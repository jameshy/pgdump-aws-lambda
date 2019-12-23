/* eslint no-underscore-dangle: 0 */
const { expect } = require('chai')
const rewire = require('rewire')
const sinon = require('sinon')
const mockDate = require('mockdate')
const mockSpawn = require('mock-spawn')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')

chai.should()
chai.use(chaiAsPromised)

const handler = rewire('../lib/handler')
const pgdump = require('../lib/pgdump')

describe('Handler', () => {
    const mockPgDumpSuccess = () => {
        const pgdumpProcess = mockSpawn()()
        pgdumpProcess.stdout.write('asdfasdf')
        pgdumpProcess.emit('close', 0)
        return Promise.resolve(pgdumpProcess)
    }
    const mockS3UploadSuccess = (stream, config, key) => {
        return Promise.resolve('mock-uploaded/' + key)
    }

    const mockEvent = {
        PGDATABASE: 'dbname',
        S3_BUCKET: 's3bucket'
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

    // mock dates, so we can test the backup file name
    mockDate.set('2017-05-02T01:33:11Z')

    it('should backup', async () => {
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
        expect(key).to.be.a.string
        expect(key).to.not.be.empty
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
