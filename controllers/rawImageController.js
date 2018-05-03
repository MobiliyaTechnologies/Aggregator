const cv = require('opencv4nodejs');
var fs = require('fs');

var config = require('../config');
var openStream = require('../controllers/liveStreamingController').openStream;
var base64_encode = require('../controllers/imageProcessingController').base64_encode;
var imageTransfer = require('../controllers/imageTransfer');

/**
* to get raw image of camera device
* @param {*string} message camera device data to get raw image 
*/

var getRawImage = function (message, callback) {
    console.log("CALL -getRawImage");
    console.log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
    parsedJson = JSON.parse(message);
    var camId = parsedJson.cameraId;

    var deviceType = parsedJson.deviceType;
    var streamingUrl = parsedJson.streamingUrl;

    switch (deviceType) {
        case 'IP':
            console.log("Checking IP camera");
            streamingUrl = "uridecodebin uri=" + streamingUrl + " ! videoconvert ! videoscale ! appsink";

        case 'DVR':
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
                    var rawImgName = camId + ".jpg";
                    var rawImgFullPath = config.rawImageDirectory + "/" + rawImgName;
                    const outBase64 = cv.imencode('.jpg', frame, [parseInt(cv.IMWRITE_JPEG_QUALITY), 50]).toString('base64'); // Perform base64 encoding

                    imageTransfer.sendImageRest(rawImgName,
                        config.sendRawImage, outBase64, camId, parsedJson.userId, streamingUrl);
                    //release the stream
                    vCap.release();
                    callback(null);
                }
                else {
                    console.log("Streaming Error in GetRawImage!\n\nURL ::", streamingUrl);
                }
            });
            break;
            
        case 'Mobile':
            console.log("RAW IMAGE CALLED --- ", camId);
            var rawImgName = camId + ".jpg";
            var rawImgFullPath = config.rawImageDirectory + "/" + rawImgName;
            if (fs.existsSync(rawImgFullPath)) {
                console.log("Found mobile camera raw image");
                var base64Image = base64_encode(rawImgFullPath);
                imageTransfer.sendImageRest(rawImgName,
                    config.sendRawImage, base64Image, camId, parsedJson.userId, streamingUrl);
            }
            else {
                console.log("Not found - Mobile camera raw Image for ",camId);
            }

            break;
        default:
            console.log("Device type not specified to server Raw Image!!");
    }
}

/**
 * download blob mobile camera raw image
 * @param {*} parsedJson 
 * @param {*} callback 
 */
var mobileCameraRawImage = function (parsedJson, callback) {
    // console.log("----+++++++RAW IMAGE MOBILE CALL ",parsedJson);
    var camId = parsedJson.camId;
    var rawImgName = camId + ".jpg";
    var blobName = parsedJson.blobName;
    var imageType = parsedJson.imageType;
    var rawImgFullPath = config.rawImageDirectory + "/" + rawImgName;

    imageProcessingController.downloadBlob(blobName, rawImgFullPath, function () {
        if (imageType == "Mobile360") {
            console.log("Raw Image dwarping needed");
            //call to dwarp
            imageProcessingController.deFishEyeImage(blobName, rawImgFullPath, config.rawImageDirectory,
                function (dwarpedImageName, destinationImageFullPath) {
                    console.log("**Raw image of mobile 360 saved - ", rawImgFullPath);
                    callback(null);
                });
        }
        else {
            callback(null);
        }
    });
}

module.exports.mobileCameraRawImage = mobileCameraRawImage;
module.exports.getRawImage = getRawImage; 
