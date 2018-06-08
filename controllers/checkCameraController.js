
var request = require('request');

var config = require('../config');
var openStream = require('../controllers/liveStreamingController').openStream;

/**
* to test device if it can stream 
* @param {*string} message 
*/
var checkCamera = function (message, callback) {
    console.log("CALL -checkCamera");
    console.log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~");

    var parsedJson = JSON.parse(message);

    var streamingUrl = parsedJson.streamingUrl;
    var deviceType = parsedJson.deviceType;

    console.log("Device Type : ", deviceType);
    console.log("Device URL to test::", streamingUrl);

    var retrytime = 1000;   //retryTime to OpenStream

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
                var options = {
                    uri: config.sendCheckCameraResponse,
                    method: 'POST',
                    json: deviceResult
                };
                request(options, function (error, response, body) {
                    // console.log(body);
                    if (!error && response.statusCode == 200) {
                        console.log("CheckCamera Response Posted\n", deviceResult.flag);
                        callback(null);

                    } else {
                        console.log("Error in posting Raw Image:", error);
                    }
                });

            });
            break;
        case 'Mobile':
            console.log("Checking Mobile camera -");
            var deviceResult = {
                "userId": parsedJson.userId,
                "camdetails": parsedJson,
                "flag": 1
            };
            var options = {
                uri: config.sendCheckCameraResponse,
                method: 'POST',
                json: deviceResult
            };
            request(options, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    console.log("Mobile CheckCamera Response posted");
                    callback(null);
                } else {
                    console.log("Error in posting Raw Image:", error);
                }
            });
            break;
    }
}

module.exports.checkCamera = checkCamera;
