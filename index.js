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
        logger.info(`bucketsByName ${bucketsByName} `);
        const namesOfBuickets = await bucketsByName.map(function (buck) {
            logger.info(`bucketsByName ${buck}`);
            logger.info(`bucketsByName ${buck.name}`);
            return buck.name
        });
        logger.info(`namesOfBuickets ${namesOfBuickets}`);
        buckets = bucketsByFilter.filter(bByFilter => {
            logger.info(`namesOfBuickets.includes(${bByFilter.name}) ${namesOfBuickets.includes(bByFilter.name)} `);
            namesOfBuickets.includes(bByFilter.name)
        });
        logger.info(`Combined buckets size ${buckets.length}`);
    } else if (bucketsByFilter) {
        buckets = bucketsByFilter;
    } else {
        buckets = bucketsByName;
    }

    const pathsArr = paths.split(',');
    for (const path of pathsArr) {
        for (bucket of buckets) {
            await
                processBucket(bucket, path)
        }
    }

    logger.info(`File deletion finished.`);
})
();

async function getFiles(bucket, options) {
    let files = [];
    await bucket.getFiles(options).then(function (data) {
        files = data[0];
    }).catch(err => logger.error(err));
    ;
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
                    logger.info(`Cheking bucket name ${bName} and found ${existMatch === true ? bucket.name : "no"} bucket`);
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

    async function getT(checked, name) {
        return await checked.exists().then(function (data) {
            //boolean if bucket exists
            if (data[0]) {
                logger.info(`Getting bucket ${name} and found ${checked.name}`);
                return checked;
            }
        }).catch(err => logger.error(err));
    }

    if (list && list != '') {
        logger.info(`Using provided buckets list ${list}`);

        var arrBuckets = list.split(',');
        buckets = await arrBuckets.map(async function (name) {
            const checked = await storage.bucket(name);
            return await getT(checked, name).then(function (data){
                return data[0];
            });
        });
        //     .filter(buck => {
        //     return buck != null
        // });
    } else {
        logger.info(`No bucket names list specified`);
    }
    logger.info(`buckets ${buckets}`);
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
