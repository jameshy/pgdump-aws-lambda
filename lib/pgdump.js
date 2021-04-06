const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const { Transform } = require('stream')

function spawnPgDump(pgdumpDir, args, env) {
    const pgDumpPath = path.join(
        pgdumpDir,
        'pg_dump'
    )
    if (!fs.existsSync(pgDumpPath)) {
        throw new Error('pg_dump not found at ' + pgDumpPath)
    }

    return spawn(pgDumpPath, args, {
        env
    })
}

function buildArgs(config) {
    let args = ['-Fc', '-Z1']
    const extraArgs = config.PGDUMP_ARGS

    if (typeof extraArgs === 'string') {
        const splitArgs = extraArgs.split(' ')
        args = args.concat(splitArgs)
    }
    else if (Array.isArray(extraArgs)) {
        args = args.concat(extraArgs)
    }

    return args
}

function pgdump(config, pgDumpSpawnFn = spawnPgDump) {
    return new Promise((resolve, reject) => {
        let headerChecked = false
        let stderr = ''

        // spawn pg_dump process
        const args = buildArgs(config)
        const env = { ...config, LD_LIBRARY_PATH: config.PGDUMP_PATH }
        const process = pgDumpSpawnFn(config.PGDUMP_PATH, args, env)

        // hook into the process
        process.stderr.on('data', data => {
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

        // watch the pg_dump stdout stream so we can check it's valid
        const transformer = new Transform({
            transform(chunk, enc, callback) {
                this.push(chunk)
                // if stdout begins with 'PGDMP' then the backup has begun
                // otherwise, we abort
                if (!headerChecked) {
                    headerChecked = true
                    if (chunk.toString('utf8').startsWith('PGDMP')) {
                        resolve(transformer)
                    }
                    else {
                        reject(
                            new Error('pg_dump gave us an unexpected response')
                        )
                    }
                }
                callback()
            }
        })

        // pipe pg_dump to transformer
        process.stdout.pipe(transformer)
    })
}
module.exports = pgdump
