const pgdump = require('../lib/pgdump')
const mockSpawn = require('mock-spawn')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')

chai.use(chaiAsPromised)
const expect = chai.expect

describe('pgdump', () => {
    it('should export a function', () => {
        return expect(pgdump).to.be.a('function')
    })

    it('should throw an error when pg_dump sends invalid data', () => {
        const pgdumpProcess = mockSpawn()()
        const pgDumpFn = () => pgdumpProcess
        const config = {}
        const p = pgdump(config, pgDumpFn)
        pgdumpProcess.stdout.write('asdfasdf')
        pgdumpProcess.stderr.write('some-error')
        pgdumpProcess.emit('close', 0)
        return expect(p).to.eventually.be.rejectedWith(
            /pg_dump gave us an unexpected response/
        )
    })

    it('should stream correctly', () => {
        const mySpawn = mockSpawn()()

        const pgDumpFn = () => mySpawn
        const config = {}
        const p = pgdump(config, pgDumpFn)
        mySpawn.stdout.write('PGDMP - data - data')
        mySpawn.emit('close', 0)

        return p.then(buffer => {
            expect(buffer.read().toString('utf8')).to.equal('PGDMP - data - data')
        })
    })
})
