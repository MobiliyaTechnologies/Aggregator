/**
* to test device if it can stream 
* @param {*string} message 
*/
var parseJson = require('parse-json');
var openStream = require('../controllers/liveStreamingController').openStream;

var checkCamera = function (message, callback) {
    console.log("CALL -checkCamera");
    console.log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~");

    var parsedJson = parseJson(message);

    var streamingUrl = parsedJson.streamingUrl;
    var deviceType = parsedJson.deviceType;

    console.log("Device URL to test::", streamingUrl);

    var retrytime = 1000;

    //depending on the device type

    switch (deviceType) {
        case 'IP':
            console.log("Checking IP camera");
            streamingUrl = "uridecodebin uri=" + streamingUrl + " ! videoconvert ! videoscale ! appsink";

        case 'DVR':
            openStream(streamingUrl, retrytime, function (cap) {
                var vCap = cap;
                if (vCap !== null) {
                    console.log("Results :: Camera device can stream!");
                    var deviceResult = {
                        "userId": parsedJson.userId,
                        "camdetails": parsedJson,
                        "flag": 1
                    };
                    vCap.release();
                }
                else {
                    console.log("Camera not able to stream");
                    var deviceResult = {
                        "userId": parsedJson.userId,
                        "camdetails": parsedJson, "flag": 0
                    };
                }
                var strDeviceResult = JSON.stringify(deviceResult);
                console.log("Result::", strDeviceResult);
                var mqttClient = require('../mqtt/mqttCommunication').mqttClient;
                //Publish the result
                mqttClient.publish('checkCameraResponse', strDeviceResult);
                callback(null);
            });
            break;
    }
}

module.exports.checkCamera = checkCamera;
