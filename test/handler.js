const expect = require('chai').expect
const rewire = require('rewire')
const sinon = require('sinon')
const mockSpawn = require('mock-spawn')

const handler = rewire('../lib/handler')


describe('Handler', () => {
    const mockpgdump = () => {
        const pgdumpProcess = mockSpawn()()
        pgdumpProcess.stdout.write('asdfasdf')
        pgdumpProcess.stderr.write('some-error')
        pgdumpProcess.emit('close', 0)
        return Promise.resolve(pgdumpProcess)
    }
    const mocks3upload = (stream, config, key) => {
        return Promise.resolve('s3-key')
    }
    it('should backup', () => {
        const s3Spy = sinon.spy(mocks3upload)
        const pgSpy = sinon.spy(mockpgdump)
        handler.__set__('pgdump', pgSpy)
        handler.__set__('uploadS3', s3Spy)

        const event = {
            PGDATABASE: 'dbname',
            S3_BUCKET: 's3bucket'
        }
        const context = {}
        const cb = sinon.spy()

        return handler(event, context, cb)
        .then(() => {
            // handler should have called pgSpy with correct arguments
            expect(pgSpy.calledOnce).to.be.true
            expect(pgSpy.firstCall.args).to.have.length(1)
            const [arg0] = pgSpy.firstCall.args
            expect(arg0.S3_BUCKET).to.equal(event.S3_BUCKET)
            expect(arg0.PGDATABASE).to.equal(event.PGDATABASE)

            // handler should have called s3spy with correct arguments
            expect(s3Spy.calledOnce).to.be.true
            expect(s3Spy.firstCall.args).to.have.length(3)
            const [stream, config, key] = s3Spy.firstCall.args
            expect(stream).to.be.ok
            expect(config.S3_BUCKET).to.equal(event.S3_BUCKET)
            expect(config.PGDATABASE).to.equal(event.PGDATABASE)
            expect(key).to.be.a.string
            expect(key).to.not.be.empty

            // cb should have been called (lambda callback)
            expect(cb.calledOnce).to.be.true
            expect(cb.firstCall.args).to.have.length(1)
            expect(cb.firstCall.args[0]).to.be.null
        })
    })
})
