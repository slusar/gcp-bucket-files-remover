const winston = require('winston');
const {LoggingWinston} = require('@google-cloud/logging-winston')
const {Storage} = require('@google-cloud/storage');

const loggingWinston = new LoggingWinston();

const logger = winston.createLogger({
    level: 'info',
    transports: [
        new winston.transports.Console(),
        // Add Stackdriver Logging
        loggingWinston,
    ]
});

var main = (async function () {

    logger.info(`File deletion start.`);

    logConfiguration(logger);

    var paths = process.env.CONFIG_GCS_FILES_PATHS;
    if (!paths || paths === '') {
        logger.info(`no path specified. doing nothing.`);
        return;
    }
    process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.CONFIG_GCS_SERVICE_ACCOUNT_FILE;

    const buckets = await getBuckets();
    logger.info(`fetched ${buckets.length} buckets`);

    const arrPaths = paths.split(',');
    arrPaths.map(path => {
        buckets.forEach(bucket => processBucket(bucket, path));
    });
    logger.info(`File deletion finished.`);
})
();

async function getFiles(bucket, options) {
    var files;
    await bucket.getFiles(options).then(function (data) {
        files = data[0];
    });
    return files;
}

async function processBucket(bucket, path) {
    logger.info(`Removing files from path ${path}`);

    var options = {
        prefix: path,
        delimiter: "/"
    };

    logger.info(`Removing from bucket ${bucket.name}`);
    const files = await getFiles(bucket, options);
    logger.info(`Found ${files.length} files to delete`);
    logger.info(`Found ${files} `);
    await files.forEach(fileToDel => {
        logger.info(fileToDel);
        logger.info(`deleting file ${fileToDel.name}`);
        fileToDel.delete();
    });
}

async function getBuckets() {
    const list = process.env.CONFIG_GCS_BUCKETS_NAME;
    const storage = new Storage();
    var buckets;
    if (list && list != '') {
        logger.info(`Using provided buckets ${list}`);

        var arrBuckets = list.split(',');
        buckets = await arrBuckets.map(name => {
            return storage.bucket(name);
        });
    } else {
        logger.info(`Using all user buckets`);
        await storage.getBuckets().then(function (data) {
            buckets = data[0];
        });
    }
    return buckets;
}

function logConfiguration(logger) {
    const config = {
        CONFIG_GCS_BUCKETS_NAME: process.env.CONFIG_GCS_BUCKETS_NAME,
        CONFIG_GCS_FILES_PATHS: process.env.CONFIG_GCS_FILES_PATHS,
    };
    logger.info(config);
}
