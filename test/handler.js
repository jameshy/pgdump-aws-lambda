/* eslint no-underscore-dangle: 0 */
const expect = require('chai').expect
const rewire = require('rewire')
const sinon = require('sinon')
const mockSpawn = require('mock-spawn')

const handler = rewire('../lib/handler')
const pgdump = require('../lib/pgdump')
var chai = require('chai')
chai.should()
var chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)

describe('Handler', () => {
    const mockPgDumpSuccess = () => {
        const pgdumpProcess = mockSpawn()()
        pgdumpProcess.stdout.write('asdfasdf')
        pgdumpProcess.emit('close', 0)
        return Promise.resolve(pgdumpProcess)
    }
    const mockS3UploadSuccess = (stream, config, key) => {
        return Promise.resolve('mock-uploaded' + key)
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


    it('should backup', () => {
        const { s3Spy, pgSpy } = makeMockHandler()

        const context = {}
        const cb = sinon.spy()

        return handler(mockEvent, context, cb)
        .then(() => {
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

            // cb should have been called (lambda callback)
            expect(cb.calledOnce).to.be.true
            expect(cb.firstCall.args).to.have.length(1)
            expect(cb.firstCall.args[0]).to.be.null
        })
    })
})
