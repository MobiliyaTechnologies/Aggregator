var PythonShell = require('python-shell');
var config = {};
config.port = 3001;
//config.host = "52.177.169.81:5006";
config.mqttBroker = "mqtt://52.177.169.81:1885";
config.stopCameraURL = "http://52.177.169.81:5005/api/resetCameraStatus";
config.stopAllCameraURL = "http://52.177.169.81:5005/api/resetAllCameraStatus";
config.camFolder = "/home/ubuntu/surveillance/jetson-dl/jetson-inference/build/aarch64/bin/Cameras/";
config.stopLiveFile = "/home/ubuntu/surveillance/jetson-dl/jetson-device-client/NodeRest/stopProcessing";
config.stopDetectnetFile = "/home/ubuntu/surveillance/jetson-dl/jetson-device-client/NodeRest/stopProcessingDetectnet";
config.uploadImageWatcher = "/home/ubuntu/surveillance/jetson-dl/jetson-inference/build/aarch64/json_watcher.py";
config.bboxFile = "/home/ubuntu/surveillance/jetson-dl/jetson-inference/build/aarch64/bin/Cameras/bbox";
config.cameraConfigFile = "/home/ubuntu/surveillance/jetson-dl/jetson-inference/build/aarch64/bin/Cameras/config";

module.exports = config;
