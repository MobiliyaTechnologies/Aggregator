
/**
 * For Aggregator Code
 */
var config = {};

config.port = 3008;

/**
 * Aggregator Details
 */
config.aggregatorName = "AggregatorCollectionModule";
config.location = "4rth Floor Amar Apex";
config.channelId = "32";
config.url = "rtsp://<username>:<password>@<ip_address>:<port>/cam/realmonitor?channel=<id>&subtype=0";
config.availability = "yes";
config.pingInterval = 900000;   //in miliseconds(15 minutes)

/**
 * Configurations
 */
config.setupType = "Cloud";     //Or onPremise

/**
 * BROKERS address
 * mqttBroker : Aggregator and Backend communication via MQTT
 */
config.mqttBroker = "mqtt://52.170.196.45:1881";    //Client
//config.mqttBroker = "mqtt://52.170.196.45:1880";	//Dev
//config.mqttBroker = "mqtt://10.9.42.243:1889";	//Local

/**
 * Backend
 */
config.host = "https://snsserverbackend.azurewebsites.net";	        //Client
//config.host = "https://snsserverdevbackend.azurewebsites.net";	//Dev
//config.host = "http://10.9.42.211:5009"; 	                        //Local

/**
 * IOT Hub Connection string
 */
config.iotHub = {
    connectionString: 'HostName=snsiothub.azure-devices.net;SharedAccessKeyName=iothubowner;SharedAccessKey=/d5Vth5hCojV4+kL0oHY00eX6xqGoKr2b13CexrSwdk='
};

//_____________________Configurations ends_____________________

/**
 * Video Indexing Configurations
 */
config.videoIndexer = {
    scheduleWriter: "./schedulerWriter.py",
    url: "https://videobreakdown.azure-api.net/Breakdowns/Api/Partner/Breakdowns",
    subscriptionKey: "fb1edaf45a6b48abb38ae4fdbe3f6d1a",
    privacy: "Public",
    localVideoUploadCallUrl: 'http://localhost:' + config.port + '/videoUploading'
};

/**
 * All directorires
 */
config.camFolder = "./Cameras";
config.livestreamingCamFolder = "./Cameras/Cam";
config.rawImageDirectory = './RawImages';

/**
 * Backend APIs
 */
config.sendLiveStreamUploadURL = config.host + "/images";
config.registerAggregator = config.host + "/devices/aggregators";
config.sendRawImage = config.host + '/devices/cameras/raw';
config.sendCheckCameraResponse = config.host + '/devices/cameras/response';
config.cloudServiceTargetUrl = config.host + "/results";

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
