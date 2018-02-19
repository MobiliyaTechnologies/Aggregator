var parseJson = require('parse-json');
const cv = require('opencv4nodejs');

/**
* to test device if it can stream 
* @param {*string} message 
*/
var checkCamera = function (message, callback) {
    console.log("CALL -checkCamera");
    console.log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~");

    var parsedJson = parseJson(message);
    if(parsedJson.streamingUrl==undefined || parsedJson.deviceType==undefined)
        return;
    var streamingUrl = parsedJson.streamingUrl;
    var deviceType = parsedJson.deviceType;

    console.log("Device URL to test::", streamingUrl);

    if (deviceType != 'Mobile') {
        try {
            const vCap = new cv.VideoCapture(streamingUrl);
            if (vCap !== null) {
                console.log("Results :: Camera device can stream!");
                var deviceResult = {
                    "userId": parsedJson.userId,
                    "camdetails": parsedJson, "flag": 1
                };
                vCap.release();
            }
        }
        //console.log("  Device Test Results::", message);
        catch (err) {
            console.log("Camera not able to stream",err);
            var deviceResult = {
                "userId": parsedJson.userId,
                "camdetails": parsedJson, "flag": 0
            };
        }
    }
    //Mobile Camera
    else {
        var deviceResult = {
            "userId": parsedJson.userId,
            "camdetails": parsedJson, 
            "flag": 1
        };
    }
    var strDeviceResult = JSON.stringify(deviceResult);
    //console.log("Result::", strDeviceResult);
    var mqttClient = require('../mqtt/mqttCommunication').mqttClient;
    //Publish the result
    mqttClient.publish('checkCameraResponse', strDeviceResult);
    callback(null);
}

module.exports.checkCamera = checkCamera;