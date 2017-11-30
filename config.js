var config = {};

config.port = 3001;
config.host = "http://52.177.169.81:5005";
config.mqttBroker = "mqtt://52.177.169.81:1885";
config.stopCameraURL = config.host + "/api/resetCameraStatus"
config.stopAllCameraURL = config.host + "/api/resetAllCameraStatus"
config.camFolder = "/home/ubuntu/surveillance/jetson-dl/jetson-inference/build/aarch64/bin/Cameras/";
config.stopLiveFile = "/home/ubuntu/surveillance/jetson-dl/jetson-device-client/NodeRest/AggregatorCode/jetson-device-client/stopProcessing";
config.stopDetectnetFile = "/home/ubuntu/surveillance/jetson-dl/jetson-device-client/NodeRest/AggregatorCode/jetson-device-client/stopProcessingDetectnet";
config.uploadImageWatcher = "/home/ubuntu/surveillance/jetson-dl/jetson-inference/build/aarch64/json_watcher.py";
config.bboxFile = "/home/ubuntu/surveillance/jetson-dl/jetson-inference/build/aarch64/bin/Cameras/bbox";
config.cameraConfigFile = "/home/ubuntu/surveillance/jetson-dl/jetson-inference/build/aarch64/bin/Cameras/config";

config.livestreamingCamFolder = "/home/ubuntu/surveillance/jetson-dl/jetson-inference/build/aarch64/bin/Cameras/Cam";
config.livestreamingDeviceInfo = "/home/ubuntu/surveillance/jetson-dl/jetson-device-client/NodeRest/AggregatorCode/jetson-device-client/Device_Information";
config.livestreamingErrorURL = config.host + "/api/errorHandling"

config.testDevive_DeviceInfo ="/home/ubuntu/jetson-device-client/NodeRest/Device_Information_temp"
    // config.folderToWatch = "/home/ubuntu/surveillance/jetson-dl/jetson-inference/build/aarch64";
    // config.cameraWatcherFolder = folderToWatch + "/Cameras/Cam";
    // config.sendResultURL = "http://52.177.169.81:5005/api/getResult"


module.exports = config;
