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
    console.log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
    parsedJson = parseJson(message);
    //console.log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~", parsedJson);

    var feature = parsedJson.feature;
    var camId = parsedJson.cameraId;
    var streamingUrl = parsedJson.streamingUrl;

    if (parsedJson.deviceType !== "Mobile") {
        //retryTime : delay(ms) after which will retry to open the stream
        var vCap, retryTime = 1000;

        //open the stream
        openStream(streamingUrl, retryTime, function (cap) {
            console.log("Open Stream responded as:: ", cap);
            vCap = cap;

            if (vCap != null) {
                console.log("*Opened the stream :", streamingUrl);

                //read one frame
                var frame = vCap.read();
                var raw = frame;
                var rawImgName = config.rawImageDirectory + "/" + camId + ".jpg";
                //write image to local FS
                cv.imwrite(rawImgName, raw, [parseInt(cv.IMWRITE_JPEG_QUALITY), 50]);

                //Send Image via MQTT
                sendImageMQTT(rawImgName, parsedJson.userId,streamingUrl);

                //release the stream
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
            sendImageMQTT(imageName, parsedJson.userId, streamingUrl);
            console.log("Sent Raw image of mobile Camera Done!");
        }
        else {
            console.log("**Raw Image for the mobile camera doesn't exist!");
        }
        callback(null);
    }
}

/**
 * sending images via MQTT
 * @param {*} imageName 
 * @param {*} userId 
 */
var sendImageMQTT = function (imageName, userId, streamingUrl) {
    //convert to base64
    var base64Raw = base64_encode(imageName);
    base64Raw = "data:image/jpg;base64, " + base64Raw;

    //Image and data          
    var imgJsonBody = {
        userId: userId,
        imgName: imageName,
        imgBase64: base64Raw,
        streamingUrl:streamingUrl
    };
    //MQTT APPROACH
    // console.log(rawJsonBody);
    var imgJsonBodyString = JSON.stringify(imgJsonBody);
    var mqttClient = require('../mqtt/mqttCommunication').mqttClient;
    mqttClient.publish('rawMQTT', imgJsonBodyString);
}

module.exports.getRawImage = getRawImage; 