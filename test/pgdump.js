const path = require('path')
const fs = require('fs')
const mockSpawn = require('mock-spawn')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const sinon = require('sinon')

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

    it('should call pg_dump with some default args', async () => {
        const pgdumpProcess = mockSpawn()()
        const pgDumpFn = sinon.fake.returns(pgdumpProcess)
        const config = {}
        const p = pgdump(config, pgDumpFn)
        pgdumpProcess.stdout.write('PGDMP - data - data')
        pgdumpProcess.emit('close', 0)
        await p

        expect(pgDumpFn.calledOnce).to.be.true
        const pgDumpArgs = pgDumpFn.getCall(0).args[1]
        expect(pgDumpArgs).to.deep.equal(['-Fc', '-Z1'])
    })

    it('should call pg_dump with provided extra arguments as array', async () => {
        const pgdumpProcess = mockSpawn()()
        const pgDumpFn = sinon.fake.returns(pgdumpProcess)
        const config = {
            PGDUMP_ARGS: ['--exclude-table=ignored-table', '-N', 'public']
        }
        const p = pgdump(config, pgDumpFn)
        pgdumpProcess.stdout.write('PGDMP - data - data')
        pgdumpProcess.emit('close', 0)
        await p

        expect(pgDumpFn.calledOnce).to.be.true
        const pgDumpArgs = pgDumpFn.getCall(0).args[1]

        expect(
            pgDumpArgs
        ).to.deep.equal(['-Fc', '-Z1', '--exclude-table=ignored-table', '-N', 'public'])
    })

    it('should call pg_dump with provided extra arguments as string', async () => {
        const pgdumpProcess = mockSpawn()()
        const pgDumpFn = sinon.fake.returns(pgdumpProcess)
        const config = {
            PGDUMP_ARGS: '--exclude-table=ignored-table -N public'
        }

        const p = pgdump(config, pgDumpFn)
        pgdumpProcess.stdout.write('PGDMP - data - data')
        pgdumpProcess.emit('close', 0)
        await p

        expect(pgDumpFn.calledOnce).to.be.true
        const pgDumpArgs = pgDumpFn.getCall(0).args[1]

        expect(
            pgDumpArgs
        ).to.deep.equal(['-Fc', '-Z1', '--exclude-table=ignored-table', '-N', 'public'])
    })

    it('should stream correctly', async () => {
        const pgdumpProcess = mockSpawn()()

        const pgDumpFn = () => pgdumpProcess
        const config = {}
        const p = pgdump(config, pgDumpFn)
        pgdumpProcess.stdout.write('PGDMP - data - data')
        pgdumpProcess.emit('close', 0)

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
