const path = require('path')
const fs = require('fs')
const mockSpawn = require('mock-spawn')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')

chai.use(chaiAsPromised)
const { expect } = chai

const pgdump = require('../lib/pgdump')
const defaultConfig = require('../lib/config')

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
        pgdumpProcess.emit('close', 0)
        return expect(p).to.eventually.be.rejectedWith(
            'pg_dump gave us an unexpected response'
        )
    })

    it('should stream correctly', async () => {
        const mySpawn = mockSpawn()()

        const pgDumpFn = () => mySpawn
        const config = {}
        const p = pgdump(config, pgDumpFn)
        mySpawn.stdout.write('PGDMP - data - data')
        mySpawn.emit('close', 0)

        const buffer = await p

        expect(buffer.read().toString('utf8')).to.equal('PGDMP - data - data')
    })

    it('should throw an error when the pg_dump binary does not exist', () => {
        const config = {
            PGDUMP_PATH: '/some/non-existant/path/pg_dump'
        }
        const p = pgdump(config)
        return expect(p).to.eventually.be.rejectedWith(
            'pg_dump not found at /some/non-existant/path/pg_dump/pg_dump'
        )
    })

    describe('default pg_dump binary', () => {
        const binaryPath = path.join(defaultConfig.PGDUMP_PATH, 'pg_dump')
        it('should exist', () => {
            if (!fs.existsSync(binaryPath)) {
                throw new Error('failed to find pg_dump at ', binaryPath)
            }
        })
        it('should be +x', () => {
            const fd = fs.openSync(binaryPath, 'r')
            const stat = fs.fstatSync(fd)

            // eslint-disable-next-line no-bitwise
            const permString = '0' + (stat.mode & 0o777).toString(8)
            if (permString !== '0755' && permString !== '0775') {
                throw new Error('binary ' + binaryPath + ' is not executable')
            }
        })
    })
})
