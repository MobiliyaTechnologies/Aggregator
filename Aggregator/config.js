/**
 * For Aggregator Code
 */
var config = {};

config.port = 3001;
config.host = "http://52.177.169.81:5008";
config.mqttBroker = "mqtt://52.177.169.81:1885";
config.mqttBrokerJetson="mqtt://10.9.42.223:1885";

config.testDevice="./testDevice.py";
config.livestreaming='./livestreaming.py';
config.stopCamera ='./stopCamera.py';
config.stopAllCamera = './stopAllCamera.py';
config.getCameraStatus='./getCameraStatus.py';
config.getRawImage='./getRawImage.py';
config.stopProcessing="./stopProcessing";

config.getRawImageUploadURL = config.host + "/api/Upload";

config.camFolder = "./Cameras";
//config.camFolderPath ="/Cameras";
config.livestreamingCamFolder = "/Cameras/Cam";
config.jetsonFolderPath = "ubuntu@10.9.43.63:/home/ubuntu/surveillance/jetson-dl/jetson-inference/build/aarch64/bin/Cameras/Cam";

config.getImage = "http://52.177.169.81:5005/api/getImage";
config.stopAllCameraURL = config.host + "/api/resetAllCameraStatus"
module.exports = config;

