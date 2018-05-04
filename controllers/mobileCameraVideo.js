const cv = require('opencv4nodejs');
var fs = require('fs');
var mkdirp = require('mkdirp');

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

    //calculate fps
    liveStreamingController.calculateFPS(streamingUrl, function (vCap, fps) {
        console.log("\n\nFPS CALCULATED :::::::::::::::::::", fps);

        var interval = fps;
        console.log("\nExpected FPS ::::::::::::::::", expectedFPS);

        expectedFPS = parseInt(fps / expectedFPS);

        console.log("\nDivision Factor ::::::::::::::::", expectedFPS);
        //open the stream
        console.log("Open Stream responded as:: ", vCap);

        if (vCap != null) {
            console.log("Stream Opened Successfully with fps ::", fps);
            console.log("*Sending frames of " + camName + " now!!\n``````````````````````````````````\n");
            var countframe = 0;
            /**
            * To stream continuous frames with interval
            */
            var camInterval = setInterval(function () {

                if (pushedInterval == false) {
                    /**To maintain live camera array */
                    liveStreamingController.liveCamIntervalArray.push({
                        camId: camId,
                        intervalObj: camInterval,
                        vCapObj: vCap
                    });
                    liveStreamingController.sendImagesToggleMap.set(camId, 0);
                    pushedInterval = true;
                }
                /**reading next frame */
                if (vCap != null) {
                    let frame = vCap.read();
                    if (frame.empty) {
                        vCap.reset();
                        frame = vCap.read();
                    }
                    if (countframe % expectedFPS == 0) {
                        //countframe reset
                        countframe = 0;
                        var timestamp = new Date().getTime();
                        //composing imagename
                        var imageName = camId + "_" + detectionType + "_" + timestamp + ".jpg";
                        var imageFullPath = filePath + imageName;
                        /**to write captured image of camera into local fs */
                        cv.imwrite(imageFullPath, frame, [parseInt(cv.IMWRITE_JPEG_QUALITY), 50]);
                        imageProcessingController.deFishEyeImage(imageName, imageFullPath,
                            destinationImageFolderPath, function (dwarpedImageName, destinationImageFullPath) {
                                // console.log("+++++++++++++++++++++++++++++", destinationImageFullPath);

                                var outBase64 = base64_encode(destinationImageFullPath);
                                imageTransfer.sendImageRest(dwarpedImageName, config.sendLiveStreamUploadURL, outBase64, camId);

                                //send to respective compute engine
                                switch (wayToCommunicate) {
                                    case 'rsync':
                                        /**
                                        * to sync newly added file with compute engine's FS
                                        */
                                        imageTransfer.rsyncInterval(0, dwarpedImageName, destinationImageFullPath,
                                            camId, jetsonFolderPath);
                                        break;

                                    case 'restAPI':
                                        /**
                                        * to send images to cloud compute engine
                                        */
                                        imageTransfer.sendImageCloudComputeEngine(timestamp, destinationImageFullPath, bboxes,
                                            imageConfig, config.cloudServiceTargetUrl, cloudServiceUrl, camName, userId, camId);
                                        break;
                                    default:
                                        console.log("Warning : Default Case executed ( specified way of communication not available:-  " + wayToCommunicate
                                            + " not served yet)!");
                                }
                            })
                    }
                    countframe = countframe + 1;
                }
                else {
                    console.log("**ERROR ::  In continuos streaming not able to stream cause Vcap is null !!")
                }
            }, 1000 / interval);
        }
        else {
            console.log("Unable to start the stream..!!");
            return;
        }
    });
}

module.exports.streamMobileVideo = streamMobileVideo;