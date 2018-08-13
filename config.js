/**
 * For Aggregator Code
 */
var config = {};

config.port = 3001;

/**
 * Aggregator Details
 */
config.aggregatorName = "AggregatorCollectionModule";
config.location = "<Location>";
config.channelId = "32";
config.url = "rtsp://<username>:<password>@<ip_address>:<port>/cam/realmonitor?channel=<id>&subtype=0";
config.availability = "yes";
config.pingInterval = 360000;   //in miliseconds(15 minutes)
config.appendMac = "demo";

/**
 * Backend Url
 */
config.host = '<backendUrl>'
/**
 * IOT Hub Connection string
 */
config.iotHub = {
    connectionString: '<IOTHubConnectionString>'
};

/**
 * Blob configurations
 */
config.blobConfiguration = {
    containerName: 'mobileimg',
    faceContainerName: 'facethreeblobcontainer',
    account: '<storageAccountName>',
    accessKey: '<storageAccountAccessKey>'
}

config.blobConfiguration.baseUrl = 'https://'+ config.blobConfiguration.account +'.blob.core.windows.net/';

/**
 * Video Indexing Configurations
 */
config.videoIndexer = {
    scheduleWriter: './schedulerWriter.py',
    url: 'https://videobreakdown.azure-api.net/Breakdowns/Api/Partner/Breakdowns',
    subscriptionKey: '<videoIndexingSubscriptionKey>',
    containerName: 'videoindexer',
    privacy: 'Private',
    localVideoUploadCallUrl: 'http://localhost:' + config.port + '/videoUploading',
    containerUrl: 'https://' + config.blobConfiguration.account + '.blob.core.windows.net/videoindexer/'
};


config.videoRetention = {
    localVideoUploadCallUrl: 'http://localhost:'+ config.port +'/videoRetention'
}



/**
 * All directorires
 */
config.jetsonCamFolder =  "/home/nvidia/ComputeEngine/darknet/Cameras";
config.camFolder = "/home/nvidia/Aggregator/Cameras";
config.livestreamingCamFolder = "/home/nvidia/Aggregator/Cameras/Cam";
config.rawImageDirectory = './RawImages';
config.imageTargetDirectory = './Images360Target';

/**
 * Backend APIs
 */
config.sendLiveStreamUploadURL = config.host + '/images';
config.registerAggregator = config.host + '/devices/aggregators';
config.sendRawImage = config.host + '/devices/cameras/raw';
config.sendCheckCameraResponse = config.host + '/devices/cameras/response';
config.cloudServiceTargetUrl = config.host + '/results';
config.sendBlobUploadStatus = config.host + '/devices/videos/retention';

config.logger = {
    "service": "AS",
    "logDirPath": "./logs",
    "debugLevel": 3,
    "infoLevel": 2,
    "warnLevel": 1,
    "errorLevel": 0,
    "maxSize": 5242880
}

module.exports = config;

