var PythonShell = require('python-shell');
var config = {};
var jsonWatcherArray = [];

config.port = 3001;
config.host = "52.177.169.81:5006";
config.mqttBroker = "mqtt://52.177.169.81:1885";
config.stopCameraURL = config.host + "/api/resetCameraStatus"
config.camFolder = "/home/ubuntu/surveillance/jetson-dl/jetson-inference/build/aarch64/bin/Cameras/";
config.stopLiveFile = "/home/ubuntu/surveillance/jetson-dl/jetson-device-client/NodeRest/stopProcessing";
config.stopDetectnetFile = "/home/ubuntu/surveillance/jetson-dl/jetson-device-client/NodeRest/stopProcessingDetectnet";
config.uploadImageWatcher = "/home/ubuntu/surveillance/jetson-dl/jetson-inference/build/aarch64/json_watcher.py";
config.bboxFile = "/home/ubuntu/surveillance/jetson-dl/jetson-inference/build/aarch64/bin/Cameras/bbox";
config.cameraConfigFile = "/home/ubuntu/surveillance/jetson-dl/jetson-inference/build/aarch64/bin/Cameras/config";

config.livestreamingCamFolder = "/home/ubuntu/surveillance/jetson-dl/jetson-inference/build/aarch64/bin/Cameras/'+'Cam"
config.livestreamingDeviceInfo = "/home/ubuntu/surveillance/jetson-dl/jetson-device-client/NodeRest/Device_Information"
config.livestreamingErrorURL = config.host + "/api/errorHandling"
    // config.folderToWatch = "/home/ubuntu/surveillance/jetson-dl/jetson-inference/build/aarch64";
    // config.cameraWatcherFolder = folderToWatch + "/Cameras/Cam";
    // config.sendResultURL = "http://52.177.169.81:5005/api/getResult"


module.exports = config;