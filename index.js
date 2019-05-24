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

    const names = process.env.CONFIG_GCS_BUCKET_NAMES;
    const nameFilter = process.env.CONFIG_GCS_BUCKET_NAME_FILTER;

    if ((!names || names === '') && (!nameFilter || nameFilter === '')) {
        logger.info(`no names or filters for buckets specified. doing nothing.`);
        return;
    }

    const paths = process.env.CONFIG_GCS_FILES_PATHS;
    if (!paths || paths === '') {
        logger.info(`no path specified. doing nothing.`);
        return;
    }
    process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.CONFIG_GCS_SERVICE_ACCOUNT_FILE;

    let bucketsByName = await getBucketsByName();
    logger.info(`Fetched ${bucketsByName ? bucketsByName.length : 0 } buckets by name`);
    let bucketsByFilter = await getBucketsByFilter();
    logger.info(`Fetched ${bucketsByFilter ? bucketsByFilter.length : 0} buckets by filter`);

    let buckets;
    if (bucketsByName && bucketsByFilter) {
        const namesOfBuckets = await Promise.all(bucketsByName.map(bucket => {
            return bucket.name
        }));
        buckets = bucketsByFilter.filter(bByFilter => {
            return namesOfBuckets.includes(bByFilter.name)
        });
        logger.info(`Combined buckets size ${buckets.length}`);
    } else if (bucketsByFilter) {
        buckets = bucketsByFilter;
    } else {
        buckets = bucketsByName;
    }

    const pathsArr = paths.split(',');
    for (bucket of buckets) {
        await
            processBucket(bucket, pathsArr);
    }

    logger.info(`File deletion finished.`);
})
();

async function getFiles(bucket) {
    let files = [];
    await bucket.getFiles().then(function (data) {
        files = data[0];
    }).catch(err => logger.error(err));
    return files;
}

async function processBucket(bucket, pathsArr) {
    logger.info(`Removing files from  ${bucket.name} for paths ${pathsArr}`);

    const files = await getFiles(bucket);
    logger.info(`Found ${files.length} files in bucket`);
    files.forEach(fileToDel => {
        for (const path of pathsArr) {
            if (fileToDel.name.match(path)) {
                logger.info(`deleting file ${fileToDel.name} as it mtches path ${path}`);
                fileToDel.delete();
            }
        }
    });
}

async function getBucketsByFilter() {
    const storage = new Storage();
    let buckets;
    const filter = process.env.CONFIG_GCS_BUCKET_NAME_FILTER;

    if (filter && filter != '') {
        await storage.getBuckets().then(function (data) {
            buckets = data[0];
        });
        logger.info(`Using provided buckets filter ${filter}`);
        var arrBuckets = filter.split(',');
        if (buckets) {
            buckets = buckets.filter(bucket => {
                let existMatch = false;
                arrBuckets.forEach(bName => {
                    if (bucket.name.match(bName)) {
                        existMatch = true;
                    }
                });
                return existMatch;
            });
        }
    } else {
        logger.info(`No filter for buckets specified`);
    }
    return buckets;
}

async function getBucketsByName() {
    const list = process.env.CONFIG_GCS_BUCKET_NAMES;
    const storage = new Storage();
    let buckets;

    async function getSingleBucket(checked) {
        return await checked.exists().then(function (data) {
            //boolean if bucket exists
            logger.info(`data[0] ${data[0]}`);
            if (data[0] === true) {
                return checked;
            } else {
                return null;
            }
        }).catch(err => logger.error(err));
    }

    if (list && list != '') {
        logger.info(`Using provided buckets list ${list}`);

        var arrBuckets = list.split(',');
        buckets = await Promise.all(
            arrBuckets.map(async (name) => {
                const checked = await storage.bucket(name);
                return await getSingleBucket(checked);
            }));
        buckets = buckets.filter(x => x);
    
        ;
    } else {
        logger.info(`No bucket names list specified`);
    }
    return buckets;
}


function logConfiguration(logger) {
    const config = {
        CONFIG_GCS_BUCKET_NAMES: process.env.CONFIG_GCS_BUCKET_NAMES,
        CONFIG_GCS_BUCKET_NAME_FILTER: process.env.CONFIG_GCS_BUCKET_NAME_FILTER,
        CONFIG_GCS_FILES_PATHS: process.env.CONFIG_GCS_FILES_PATHS,
    };
    logger.info(config);
}
