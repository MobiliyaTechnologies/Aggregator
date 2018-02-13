/**
 * For Aggregator Code
 */
var config = {};

config.port = 3008;
config.rawImageDirectory = './RawImages';

config.imageTargetDirectory = './Images360Target';
config.aggregatorName = "Aggregator06";
config.location = "4rth Floor Amar Apex";
config.channelId = "32";
config.url = "rtsp://<username>:<password>@<ip_address>:<port>/cam/realmonitor?channel=<id>&subtype=0";
config.availability = "yes";
/**
 * BROKERS address
 * mqttBroker : Aggregator and Backend communication
 */
//config.mqttBroker = "mqtt://52.177.169.81:1887";
config.mqttBroker = "mqtt://10.9.44.101:1889";

//config.host = "http://52.177.169.81:5008";
// config.host = "https://snsbackend.mobiliya.com:5009";10.9.42.211:5009
config.host = "http://10.9.42.211:5009";


config.cloudComputeEngine = "http://10.9.44.101:5003";
// config.cloudComputeEngine = "http://10.9.43.130:5004";

config.cloudFaceRecognitionComputeEngine = "http://10.9.43.130:5004";

config.registerAggregator = config.host + "/devices/aggregators";
/** 
 * URL of VM to send images
 */
config.sendLiveStreamUploadURL = config.host + "/images";
//base directory
config.camFolder = "./Cameras";
config.livestreamingCamFolder = "./Cameras/Cam";

config.cloudServiceFaceDetectionUrl = config.cloudComputeEngine + "/faces";
config.cloudServiceFaceRecognizeUrl = config.cloudComputeEngine + "/faces/recognize";

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
