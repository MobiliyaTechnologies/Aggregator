const cv = require('opencv');
var fs = require('fs');
var mkdirp = require('mkdirp');

var config = require('../config');
var liveStreamingController = require('../controllers/liveStreamingController');
var imageTransfer = require('../controllers/imageTransfer');
var base64_encode = require('../controllers/imageProcessingController').base64_encode;
var imageProcessingController = require('../controllers/imageProcessingController');

var streamMobileVideo = function (parsedJson,cameraFolder) {
    console.log("CALL -startLiveStreamingMobileVideo");
    console.log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
    console.log("Starting stream with data::", JSON.stringify(parsedJson));

    var destinationImageFolderPath = cameraFolder + "Dwarped";
    //creating cameraId folder
    if (!fs.existsSync(destinationImageFolderPath)) {
        mkdirp(destinationImageFolderPath, function (err) {
            if (err) {
                console.log('Error in creating folder');
            } else {
                console.log("cameraIdDwarped directory created successfully!");
            }
        });
    }

    var fps;
    //fps:frames per second, interval: call to function in interval {vCap.get(5); vCap.get(CV_CAP_PROP_FPS)}

    var pushedInterval = false;
    //filepath to stream images
    var filePath = cameraFolder + "/";

    var streamingUrl = parsedJson.streamingUrl;
    var camId = parsedJson.camId;
    var detectionType = parsedJson.feature;
    var jetsonFolderPath = parsedJson.jetsonCamFolderLocation;
    var bboxes = parsedJson.boundingBox;
    var imageConfig = {
        frameWidth: parsedJson.frameWidth.width,
        frameHeight: parsedJson.frameWidth.height,
        ImageWidth: parsedJson.imageWidth,
        ImageHeight: parsedJson.imageHeight
    }
    var camName = parsedJson.deviceName;
    var userId = parsedJson.userId;
    var cloudServiceUrl = parsedJson.cloudServiceUrl;
    var deviceType = parsedJson.deviceType;
    var wayToCommunicate = parsedJson.wayToCommunicate;
    var expectedFPS = parsedJson.computeEngineFps;

    var retryTime = 1000; //time interval after which openStream will try open the stream pipeline
    var vCap;


}

module.exports.streamMobileVideo = streamMobileVideo;
