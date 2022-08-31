const utils = require("./utils");
const downloadS3 = require("./download-s3");
const encryption = require("./encryption");
const decorateWithIamToken = require("./iam");

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const { Transform } = require("stream");

function spawnPgRestore(pgrestoreDir, args, env) {
  const pgRestorePath = path.join(pgrestoreDir, "pg_restore");
  if (!fs.existsSync(pgRestorePath)) {
    throw new Error("pg_restore not found at " + pgRestorePath);
  }

  return spawn(pgRestorePath, args, {
    env,
  });
}

function buildArgs(config) {
  let args = [
    // https://www.postgresql.org/docs/13/app-pgrestore.html
    // "-a",
    // "-c",
    "-v",
    "-1",
    `-d${config.PGDATABASE}`,
    `-h${config.PGHOST}`,
    `-U${config.PGUSER}`,
    "/tmp/filename",
  ];
  const extraArgs = config.PGRESTORE_ARGS;

  if (typeof extraArgs === "string") {
    const splitArgs = extraArgs.split(" ");
    args = args.concat(splitArgs);
  } else if (Array.isArray(extraArgs)) {
    args = args.concat(extraArgs);
  }

  return args;
}

function pgrestore(config, pgRestoreSpawnFn = spawnPgRestore) {
  return new Promise((resolve, reject) => {
    let headerChecked = false;
    let stderr = "";

    // spawn pg_restore process
    const args = buildArgs(config);
    const env = { ...config, LD_LIBRARY_PATH: config.PGRESTORE_PATH };
    const process = pgRestoreSpawnFn(config.PGRESTORE_PATH, args, env);

    // hook into the process
    process.stderr.on("data", (data) => {
      stderr += data.toString("utf8");
    });

    process.on("close", (code) => {
      // reject our promise if pg_restore had a non-zero exit
      if (code !== 0) {
        return reject(new Error("pg_restore process failed: " + stderr));
      }
      // check that pgrestore actually gave us some data
      // if (!headerChecked) {
      //   return reject(new Error("pg_restore gave us an unexpected response"));
      // }
    });

    // watch the pg_restore stdout stream so we can check it's valid
    const transformer = new Transform({
      transform(chunk, enc, callback) {
        this.push(chunk);
        // if stdout begins with 'pg_restore' then the restore has begun
        // otherwise, we abort
        if (!headerChecked) {
          headerChecked = true;
          if (chunk.toString("utf8").startsWith("pg_restore")) {
            resolve(transformer);
          } else {
            reject(new Error("pg_restore gave us an unexpected response"));
          }
        }
        callback();
      },
    });

    // pipe pg_restore to transformer
    process.stdout.pipe(transformer);
  });
}

async function restore(config) {
  config = config.USE_IAM_AUTH === true ? decorateWithIamToken(config) : config;

  if (!config.PGDATABASE) {
    throw new Error("PGDATABASE not provided in the event data");
  }
  if (!config.S3_BUCKET) {
    throw new Error("S3_BUCKET not provided in the event data");
  }
  console.log(
    `Attempting to restore ${config.RESTORE_FILE} from ${config.S3_BUCKET} to ${config.PGDATABASE}`
  );
  downloadS3(config, config.RESTORE_FILE);

  await pgrestore(config);
}

module.exports = restore;
