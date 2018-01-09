/**
 * For Aggregator Code
 */
var config = {
    
    AzureServerUrl:"",
    Version:"1.01",
    port = 3001,

    /**
     * BROKERS address
     * mqttBroker : Aggregator and WebApp communication
     */
    mqttBroker = "mqtt://52.177.169.81:1887",

    host = "http://52.177.169.81:5008",

    cloudComputeEngine = "http://52.177.169.81:5003",

    /**
     * Target jetson path
     */
    jetsonFolderPath = "ubuntu@10.9.44.132:/home/ubuntu/surveillance/jetson-dl/jetson-inference/build/aarch64/bin/Cameras/Cam",
    /**
     * URL of VM to send images
     */
    sendLiveStreamUploadURL = config.host + "/images",
    //base directory
    camFolder = "./Cameras",
    livestreamingCamFolder = "./Cameras/Cam",

    cloudServiceUrl = config.cloudComputeEngine + "/faces",
    cloudServiceTargetUrl = config.host + "/results",
}
module.exports = config;

