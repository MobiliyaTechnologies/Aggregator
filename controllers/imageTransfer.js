var base64_encode = require('./imageProcessingController').base64_encode;

/**
 * common function to send Images using MQTT in base64 format
 * @param {*} imageName 
 * @param {*} format 
 * @param {*} mqttTopic 
 * @param {*} imageFullPath 
 * @param {*} userId 
 * @param {*} streamingUrl 
 */
var sendImageBase64MQTT = function (imageName, format, mqttTopic,
    imageFullPath = undefined, userId = undefined, streamingUrl= undefined) {

    if (format != "base64") {
        //convert to base64
        base64Image = base64_encode(imageFullPath);
    }
    base64Image = "data:image/jpg;base64, " + base64Image;

    //Image and data          
    var imgJsonBody = {
        userId: userId,
        imgName: imageFullPath,
        imgBase64: base64Image
    };
    //MQTT APPROACH
    var imgJsonBodyString = JSON.stringify(imgJsonBody);
    var mqttClient = require('../mqtt/mqttCommunication').mqttClient;
    mqttClient.publish(mqttTopic, imgJsonBodyString);
}

module.exports.sendImageBase64MQTT = sendImageBase64MQTT;