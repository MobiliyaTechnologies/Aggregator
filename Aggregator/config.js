/**
 * For Aggregator Code
 */
var config = {};

config.port = 3001;
config.host = "http://52.177.169.81:5008";
config.mqttBroker = "mqtt://52.177.169.81:1887";
config.mqttBrokerJetson="mqtt://10.9.44.101:1887";

config.testDevice="./testDevice.py";
config.livestreaming='./livestreaming.py';
config.stopCamera ='./stopCamera.py';
config.stopAllCamera = './stopAllCamera.py';
config.getCameraStatus='./getCameraStatus.py';
config.getRawImage='./getRawImage.py';
config.stopProcessing="./stopProcessing";

config.getRawImageUploadURL = config.host + "/api/Upload";
config.sendLiveStreamUploadURL = config.host + "/api/getImage";

config.camFolder = "./Cameras";
//config.camFolderPath ="/Cameras";
config.livestreamingCamFolder = "/Cameras/Cam";
config.jetsonFolderPath = "ubuntu@10.9.44.132:/home/ubuntu/surveillance/jetson-dl/jetson-inference/build/aarch64/bin/Cameras/Cam";
//config.getImage = "http://52.177.169.81:5008/api/getImage";
config.getImage = "http://52.177.169.81:5008/api/getImage";
//config.getImage = "http://10.9.44.39:5008/api/getImage";
config.stopAllCameraURL = config.host + "/api/resetAllCameraStatus";
config.cloudServiceUrl = "http://52.177.169.81:5003/faces";
config.cloudServiceTargetUrl = "http://52.177.169.81:5008/api/getResult";//10.9.42.211:5008/api/getResult";
module.exports = config;

