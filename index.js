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

    logConfiguration(logger);

    var paths = process.env.CONFIG_GCS_FILES_PATHS;
    if (!paths || paths === '') {
        logger.debug(`no path specified. doing nothing.`);
        return;
    }

    const storage = new Storage();

    const list = process.env.CONFIG_GCS_BUCKETS_NAME;
    var buckets;
    if (list && list != '') {
        logger.debug(`Using provided buckets ${list}`);

        var arrBuckets = list.split(',');
        buckets = arrBuckets.map(name => {
            return storage.bucket(name);
        });
    } else {
        logger.debug(`Using all user buckets`);
        buckets = Array.of(await storage.getBuckets());
    }

    const arrPaths = paths.split(',');
    arrPaths.map(path => {
        var options = {
            prefix: path,
            delimiter: "/"
        };
        buckets.forEach(bucket => {
            bucket.getFiles(options).forEach(f => {
                logger.debug(`deleting file ${f.name}`);
                f.delete();
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
