const spawn = require('child_process').spawn
const through2 = require('through2')
const path = require('path')
const fs = require('fs')

function spawnPgDump(config) {
    const pgDumpPath = path.join(
        config.PGDUMP_PATH,
        'pg_dump'
    )
    if (!fs.existsSync(pgDumpPath)) {
        throw new Error('pg_dump not found at ' + pgDumpPath)
    }
    const env = Object.assign({}, config, {
        LD_LIBRARY_PATH: config.PGDUMP_PATH
    })
    return spawn(pgDumpPath, ['-Fc', '-Z 1'], {
        env
    })
}

function pgdumpWrapper(config, pgDumpSpawnFn = spawnPgDump) {
    return new Promise((resolve, reject) => {
        let headerChecked = false
        let stderr = ''

        // spawn pg_dump process
        const process = pgDumpSpawnFn(config)

        // hook into the process
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
            // check that pgdump actually gave us some data
            if (!headerChecked) {
                return reject(
                    new Error('pg_dump gave us an unexpected response')
                )
            }
            return null
        })

        // use through2 to proxy the pg_dump stdout stream
        // so we can check it's valid
        const buffer = through2(function (chunk, enc, callback) {
            this.push(chunk)
            // if stdout begins with 'PGDMP' then the backup has begun
            // otherwise, we abort
            if (!headerChecked) {
                headerChecked = true
                if (chunk.toString('utf8').startsWith('PGDMP')) {
                    resolve(buffer)
                }
                else {
                    reject(
                        new Error('pg_dump gave us an unexpected response')
                    )
                }
            }
            callback()
        })

        // pipe pg_dump to buffer
        process.stdout.pipe(buffer)
    })
}
module.exports = pgdumpWrapper
