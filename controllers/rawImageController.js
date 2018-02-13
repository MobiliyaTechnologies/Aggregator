var config = require('../config');
var parseJson = require('parse-json');
const cv = require('opencv4nodejs');
var fs = require('fs');
var openStream = require('../controllers/liveStreamingController').openStream;
var base64_encode = require('../controllers/imageProcessingController').base64_encode;
/**
* to get raw image of camera device
* @param {*string} message camera device data to get raw image 
*/
var getRawImage = function (message, callback) {
    console.log("CALL -getRawImage");
    parsedJson = parseJson(message);
    console.log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~", parsedJson);

    var feature = parsedJson.feature;
    var camId = parsedJson.cameraId;
    var streamingUrl = parsedJson.streamingUrl;

    if (parsedJson.deviceType !== "Mobile") {
        //open the stream
        var vCap,retryTime=1000;

        openStream(streamingUrl, retryTime, function (cap) {
            console.log("Open Stream responded as:: ", cap);
            vCap = cap;


            if (vCap != null) {
                console.log("*Opened the stream :", streamingUrl);

                var frame = vCap.read();
                console.log("in readAsync");
                var raw = frame;
                var rawImgName = config.rawImageDirectory + "/" + camId + ".jpg";
                //write image to local FS
                cv.imwrite(rawImgName, raw, [parseInt(cv.IMWRITE_JPEG_QUALITY), 50]);
                //Send Image via MQTT
                sendImageMQTT(rawImgName, parsedJson.userId);
                vCap.release();
                callback(null);
            }
            else {
                console.log("Streaming Error in GetRawImage!\n\nURL ::", streamingUrl);
            }
        });
    } else {
        console.log("Sending Raw image of Mobile Camera");
        var imageName = config.rawImageDirectory + "/" + camId + ".jpg";
        if (fs.existsSync(imageName)) {
            //Send Image via MQTT
            sendImageMQTT(imageName, parsedJson.userId);
            console.log("Sent Raw image of mobile Camera Done!");
        }
        else {
            console.log("**Raw Image for the mobile camera doesn't exist!");
        }
        callback(null);
    }
}

var sendImageMQTT = function (imageName, userId) {
    //convert to base64
    var base64Raw = base64_encode(imageName);
    base64Raw = "data:image/jpg;base64, " + base64Raw;

    //Sync          
    var imgJsonBody = {
        userId: userId,
        imgName: imageName,
        imgBase64: base64Raw
    };
    //MQTT APPROACH
    // console.log(rawJsonBody);

    var imgJsonBodyString = JSON.stringify(imgJsonBody);
    var mqttClient = require('../mqtt/mqttCommunication').mqttClient;
    mqttClient.publish('rawMQTT', imgJsonBodyString);
}

module.exports.getRawImage = getRawImage; 