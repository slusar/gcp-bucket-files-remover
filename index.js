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

    console.log('start');
    console.log(process.env.CONFIG_GCS_SERVICE_ACCOUNT_FILE);
    console.log(process.env.GOOGLE_CLOUD_PROJECT);
    console.log(process.env.CONFIG_GCS_FILES_PATHS);

    logConfiguration(logger);
    console.log('logged');
    var paths = process.env.CONFIG_GCS_FILES_PATHS;
    if (!paths || paths === '') {
        console.log(`no path specified. doing nothing.`);
        logger.debug(`no path specified. doing nothing.`);
        return;
    }

    console.log('start 2');
    process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.CONFIG_GCS_SERVICE_ACCOUNT_FILE;
    console.log('start 3');

    const storage = new Storage();
    console.log('start 4');
    const list = process.env.CONFIG_GCS_BUCKETS_NAME;
    var buckets;
    if (list && list != '') {
        logger.info(`Using provided buckets ${list}`);

        var arrBuckets = list.split(',');
        buckets = arrBuckets.map(name => {
            return storage.bucket(name);
        });
    } else {
        logger.info(`Using all user buckets`);
        buckets = await storage.getBuckets();
    }
    logger.info(buckets.length);

    const arrPaths = paths.split(',');
    arrPaths.map(path => {
        logger.info(`Removing files from path ${path}`);

        var options = {
            prefix: path,
            delimiter: "/"
        };
        buckets.forEach(bucket => {
            logger.info(`Removing from bucket ${bucket.name}`);

            bucket.getFiles(options).forEach(fileToDel => {
                logger.info(`deleting file ${fileToDel.name}`);
                fileToDel.delete();
            });
        });
    });
})
();

function logConfiguration(logger) {
    const config = {
        CONFIG_GCS_BUCKETS_NAME: process.env.CONFIG_GCS_BUCKETS_NAME,
        CONFIG_GCS_FILES_PATHS: process.env.CONFIG_GCS_FILES_PATHS,
    };
    logger.info(config);
}
