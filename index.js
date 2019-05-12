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

    const paths = process.env.CONFIG_GCS_FILES_PATHS;
    if (!paths || paths === '') {
        logger.info(`no path specified. doing nothing.`);
        return;
    }
    process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.CONFIG_GCS_SERVICE_ACCOUNT_FILE;

    const buckets = await getBuckets();
    logger.info(`Fetched ${buckets.length} buckets`);
    const pathsArr = paths.split(',');
    for (const path of pathsArr) {
        for (bucket of buckets) {
            await processBucket(bucket, path)
        }
    }

    logger.info(`File deletion finished.`);
})
();

async function getFiles(bucket, options) {
    let files = [];
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
    files.forEach(fileToDel => {
        logger.info(`deleting file ${fileToDel.name}`);
        fileToDel.delete();
    });
}

async function getBuckets() {
    const list = process.env.CONFIG_GCS_BUCKETS_NAME;
    const storage = new Storage();
    let buckets;
    if (list && list != '') {
        logger.info(`Using provided buckets ${list}`);

        var arrBuckets = list.split(',');
        buckets = await arrBuckets.map(name => {
            let buc = null;
            storage.bucket(name).exist().then(function (data) {
                buc = data[0];
            });
            logger.info(`Getting bucket ${name} and found bucket ${buc != null}`);
            return buc;
        }).filter(buc => buc != null);
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
