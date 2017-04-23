const spawn = require('child_process').spawn
const through2 = require('through2')
const path = require('path')
const fs = require('fs')

function spawnPgDump(config) {
    const pgDumpPath = path.join(
        config.PGDUMP_PATH || './bin/postgres-9.6.2',
        'pg_dump'
    )
    if (!fs.existsSync(pgDumpPath)) {
        throw new Error('pg_dump not found at ' + pgDumpPath)
    }
    const env = Object.assign({}, config, {
        LD_LIBRARY_PATH: path.join(__dirname, '../bin/postgres-9.6.2')
    })
    return spawn(pgDumpPath, ['-Fc'], {
        env
    })
}

function pgdumpWrapper(config, pgdumpFn = spawnPgDump) {
    return new Promise((resolve, reject) => {
        let backupStarted = false
        let stderr = ''

        // spawn pg_dump process and attach hooks
        const process = pgdumpFn(config)

        process.stderr.on('data', (data) => {
            stderr += data.toString('utf8')
        })

        process.on('close', code => {
            // reject our promise if pg_dump had a non-zero exit
            if (code !== 0) {
                return reject(
                    new Error('pg_dump process failed: ' + stderr)
                )
            }
            // otherwise a zero exit is good
            // check that pgdump gave us an expected response
            if (!backupStarted) {
                return reject(
                    new Error('pg_dump didnt send us a recognizable dump')
                )
            }
            return null
        })

        // use through2 to proxy the pg_dump stdout stream
        // so we can check it's valid
        const buffer = through2(function (chunk, enc, callback) {
            this.push(chunk)
            // if stdout begins with 'PGDMP' then the backup has begun
            if (!backupStarted && chunk.toString('utf8').startsWith('PGDMP')) {
                backupStarted = true
                resolve(buffer)
            }
            callback()
        })
        // pipe pg_dump to buffer
        process.stdout.pipe(buffer)
    })
}
module.exports = pgdumpWrapper
