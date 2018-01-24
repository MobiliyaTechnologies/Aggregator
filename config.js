/**
 * For Aggregator Code
 */
var config = {};

config.port = 3001;

config.aggregatorName = "Aggregator 02";
config.location = "4rth Floor Amar Apex";
config.channelId = "32";
config.url = "rtsp://<username>:<password>@<ip_address>:<port>/cam/realmonitor?channel=<id>&subtype=0";
config.availability = "yes";
/**
 * BROKERS address
 * mqttBroker : Aggregator and WebApp communication
 */
//config.mqttBroker = "mqtt://52.177.169.81:1887";
config.mqttBroker = "mqtt://52.177.169.81:1880";

//config.host = "http://52.177.169.81:5008";
config.host = "http://52.177.169.81:5009";

config.cloudComputeEngine = "http://52.177.169.81:5003";

config.registerAggregator = config.host + "/devices/aggregators";
/**
 * Target jetson path
 */
// config.jetsonFolderPath = "ubuntu@10.9.43.63:/home/ubuntu/surveillance/jetson-dl/jetson-inference/build/aarch64/bin/Cameras/Cam";
// config.jetsonFolderPath = "ubuntu@10.9.43.63:/home/ubuntu/Compute-Engine-Yolo/darknet/Cameras/Cam";
config.jetsonFolderPath = "nvidia@10.9.43.74:/home/nvidia/Compute-Engine-Yolo/darknet/Cameras/Cam";
/**
 * URL of VM to send images
 */
config.sendLiveStreamUploadURL = config.host + "/images";
//base directory
config.camFolder = "./Cameras";
config.livestreamingCamFolder = "./Cameras/Cam";

config.cloudServiceUrl = config.cloudComputeEngine + "/faces";
config.cloudServiceTargetUrl = config.host + "/results";

module.exports = config;

