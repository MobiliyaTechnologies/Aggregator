
/**
 * For Aggregator Code
 */
var config = {};

config.port = 3011;

config.rawImageDirectory = './RawImages';
config.imageTargetDirectory = './Images360Target';
config.aggregatorName = "AggregatorLocalAnkita";
config.location = "4rth Floor Amar Apex";
config.channelId = "32";
config.url = "rtsp://<username>:<password>@<ip_address>:<port>/cam/realmonitor?channel=<id>&subtype=0";
config.availability = "yes";
config.pingInterval = 900000;   //in miliseconds(9 sec)

/**
 * path to schedulerWriter python code
 */
config.videoIndexer = {
    scheduleWriter: "./schedulerWriter.py",
    url: "https://videobreakdown.azure-api.net/Breakdowns/Api/Partner/Breakdowns",
    subscriptionKey: "fb1edaf45a6b48abb38ae4fdbe3f6d1a",
    privacy: "Public",
    localVideoUploadCallUrl: 'http://localhost:' + config.port + '/videoUploading'
};

/**
 * BROKERS address
 * mqttBroker : Aggregator and Backend communication
 */

//config.mqttBroker = "mqtt://52.170.196.45:1881";
//config.mqttBroker = "mqtt://52.170.196.45:1880";	//Client
config.mqttBroker = "mqtt://10.9.42.243:1889";	//Local

/**
 * Backend
 */
//config.host = "http://52.170.196.45:5007";
//config.host = "https://snsbackend.mobiliya.com:5007";
//config.host = "https://snsserverbackend.azurewebsites.net";	//client
config.host = "http://10.9.42.211:5009"; 	//Local

config.registerAggregator = config.host + "/devices/aggregators";

config.iotHub = {
    connectionString: 'HostName=snsiothub.azure-devices.net;SharedAccessKeyName=iothubowner;SharedAccessKey=/d5Vth5hCojV4+kL0oHY00eX6xqGoKr2b13CexrSwdk='
};
/** 
 * URL of VM to send images
 */
config.sendLiveStreamUploadURL = config.host + "/images";
//base directory
config.camFolder = "./Cameras";
config.livestreamingCamFolder = "./Cameras/Cam";

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
