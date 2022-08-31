const AWS = require("aws-sdk");
const fs = require("fs");

// configure AWS to log to stdout
AWS.config.update({
  logger: process.stdout,
});

async function downloadS3(config, key) {
  const s3 = new AWS.S3({
    region: config.S3_REGION,
  });

  console.log(`Trying to getObject: ${config.S3_BUCKET}/${key}`);

  s3.getObject(
    {
      Bucket: config.S3_BUCKET,
      Key: key,
    },
    function (err, data) {
      if (err) {
        console.error(err.code, "-", err.message);
      }

      fs.writeFile("/tmp/filename", data.Body, function (err) {
        if (err) console.log(err.code, "-", err.message);
      });
    }
  );
}

module.exports = downloadS3;
