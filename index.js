require('string-format').extend(String.prototype)

const AWS = require('aws-sdk')
const spawn = require('child_process').spawn
const path = require('path')
const moment = require('moment')
const through2 = require('through2')

// configure aws
AWS.config.update({
    region: 'eu-west-1',
    logger: process.stdout
})

// config
var PG_DUMP_ENV = {
    LD_LIBRARY_PATH: './bin'
}

function uploadToS3(env, readStream, key, cb) {
    console.log('streaming to s3 bucket={}, key={}'.format(env.S3_BUCKET, key))
    var s3Obj = new AWS.S3({params: {
        Bucket: env.S3_BUCKET,
        Key: key,
        ACL: 'bucket-owner-full-control'
    }})

    s3Obj.upload({Body: readStream})
    .send(function(err, data) {
        if (err) {
            console.log(err.stack)
            cb(err)
        }
        else {
            console.log("Uploaded the file at", data.Location)
            cb(null)
        }
    })
}

exports.handler = function(event, context, cb) {
    // prepare environment variables for pg_dump
    var env = Object.assign({}, PG_DUMP_ENV, event)
    var stderr = ''

    if (!env.PGDATABASE || !env.S3_BUCKET) {
        return cb('configuration not found in the event data')
    }

    // the filename of our backup file
    var timestamp = moment().format('DD-MM-YYYY@HH-mm-ss')
    var day = moment().format('YYYY-MM-DD')
    var filename = '{}-{}.backup'.format(env.PGDATABASE, timestamp)

    // the s3 key (includes directory)
    var subkey = env.SUBKEY || ''
    var key = path.join(subkey, day, filename)

    // spawn pg_dump process
    var pgDumpProcess = spawn('./bin/pg_dump', ['-Fc'], {
        env: env
    })

    // capture stderr for printing when pg_dump return code != 0
    pgDumpProcess.stderr.on('data', (data) => {
        stderr += data.toString('utf8')
    })

    pgDumpProcess.on('close', (code) => {
        if (code === 1) {
            return cb(new Error('pg_dump process failed: {}'.format(stderr)))
        }
        if (code === 0 && !pgDumpStarted) {
            return cb(new Error('pg_dump didnt send us a recognizable dump (output did not start with PGDMP)'))
        }
    })

    var pgDumpStarted
    var buffer = through2(function (chunk, enc, callback) {
        this.push(chunk)
        // if stdout begins with PGDMP, we know pg_dump is going strong, so continue with dumping
        // we assume that the first chunk is large enough to contain PGDMP under all circumstances
        if (!pgDumpStarted && chunk.toString('utf8').startsWith('PGDMP')) {
            pgDumpStarted = true
            uploadToS3(env, buffer, key, function(err, result) {
                if (!err) {
                    var msg = 'sucessfully dumped {} to {}'.format(env.PGDATABASE, key)
                    console.log(msg)
                    return cb(null, msg)
                }
                else {
                    return cb(err, result)
                }
            })
        }
        return callback()
    })

    // pipe pg_dump to buffer
    pgDumpProcess.stdout.pipe(buffer)
}

// for testing locally
// PG_DUMP_ENV = {
//     PGDATABASE: 'my-database',
//     PGUSER: 'postgres',
//     PGPASSWORD: 'dev',
//     PGHOST: 'localhost',
//     LD_LIBRARY_PATH: './lib',
//     SUBKEY: 'testing/',
//     S3_BUCKET: 'my-database-backups'
// }
// exports.handler(null, null, (err, response) => {
//     if (err) {
//         console.error(err)
//     }
// })
