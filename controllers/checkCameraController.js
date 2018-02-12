
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
    var streamingUrl = parsedJson.streamingUrl;
    var deviceType = parsedJson.deviceType;
    console.log("DEVICE URL to test::", streamingUrl);

    if (deviceType != 'Mobile') {
        try {
            const vCap = new cv.VideoCapture(streamingUrl);
            if (vCap !== null) {
                console.log("Camera device can stream!");
                var deviceResult = {
                    "userId": parsedJson.userId,
                    "camdetails": parsedJson, "flag": 1
                };
                vCap.release();
            }
        }
        //console.log("  Device Test Results::", message);
        catch (err) {
            console.log(err);
            var deviceResult = {
                "userId": parsedJson.userId,
                "camdetails": parsedJson, "flag": 0
            };
        }
    }

    else {
        var deviceResult = {
            "userId": parsedJson.userId,
            "camdetails": parsedJson, "flag": 1
        };
    }
    var strdeviceResult = JSON.stringify(deviceResult);
    //console.log("Result::", strdeviceResult);
    var mqttClient = require('../mqtt/mqttCommunication').mqttClient;
    mqttClient.publish('checkCameraResponse', strdeviceResult);
    callback(null);

}

module.exports.checkCamera = checkCamera;