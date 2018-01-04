/**
 * For Aggregator Code
 */
var config = {};

config.port = 3001;
config.host = "http://52.177.169.81:5008";

config.cloudComputeEngine = "http://52.177.169.81:5003";
/**
 * BROKERS address
 * mqttBroker : Aggregator and WebApp communication
 */
config.mqttBroker = "mqtt://52.177.169.81:1887";
/**
 * Target jetson path
 */
config.jetsonFolderPath = "ubuntu@10.9.44.132:/home/ubuntu/surveillance/jetson-dl/jetson-inference/build/aarch64/bin/Cameras/Cam";

config.sendLiveStreamUploadURL = config.host + "/api/getImage";

config.camFolder = "./Cameras";
config.livestreamingCamFolder = "/Cameras/Cam";

config.cloudServiceUrl = config.cloudComputeEngine + "/faces";
config.cloudServiceTargetUrl = config.host+"/api/getResult";

module.exports = config;

