var config = require('../config');
var imageProcessingController = require('./imageProcessingController');
var IOThubCommunication = require('../communication/IOTHub');

var fs = require('fs');
var mkdirp = require('mkdirp');
const cv = require('opencv4nodejs');
const classifier = new cv.CascadeClassifier(cv.HAAR_FRONTALFACE_ALT2);

//to keep track of live cameras
var liveCamIntervalArray = [];
var sendImagesToggleMap = new Map();
var liveCameraMap = new Map();

/**
* to create Cam<CamId> folder and call startStreaming
* @param {*string} message 
* @param {*function} callback 
*/
var createCameraFolder = function (message, callback) {
    console.log("CALL -createCameraFolder");
    console.log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~");

    var parsedJson = JSON.parse(message);

    var camId = parsedJson.camId;
    var cameraFolder = config.livestreamingCamFolder + camId;

    //creating cameraId folder
    if (!fs.existsSync(cameraFolder)) {
        mkdirp(cameraFolder, function (err) {
            if (err) {
                console.log('Error in creating folder');
            } else {
                console.log("cameraId directory created successfully!");
                callback(parsedJson, cameraFolder);
            }
        });
    } else
        callback(parsedJson, cameraFolder);
};

/**
 * to open the stream
 * @param {*string} streamingUrl 
 * @param {*string} retryTime 
 * @param {*function} callback 
 */
var openStream = function (streamingUrl, retryTime, callback) {
    var failflag = 0;
    var failcount = 0;
    var maxTries = 4;
    //webcam
    if (streamingUrl.indexOf("webcam") === 0)
        streamingUrl = parseInt(streamingUrl.replace("webcam", ""));

    console.log("**In STREAM OPENING TEST for -", streamingUrl);

    var retryInterval = setInterval(function () {
        var vCap = null;
        if (failflag == 0) {
            try {
                vCap = new cv.VideoCapture(streamingUrl);
                if (vCap != null)
                    failflag = 1;
                console.log("**STREAM OPENING DONE     !");
            } catch (error) {
                failflag = 0;
                failcount = failcount + 1;
                console.log("**FAILCOUNT  ::", failcount);
                console.log("**Error in opening stream :\nERROR::\n ", error);
                console.log("___________________________________________________________________")
            }
        }
        if (failflag == 1) {
            callback(vCap);
            clearInterval(retryInterval);
        }
        if (failcount === maxTries) {
            clearInterval(retryInterval);
            callback(null);
            console.log("**Reached Maximum tries ...\nCamera not able to stream-", streamingUrl);
        }
    }, retryTime);
}

var calculateFPS = function (streamingUrl, callback) {
    var framesToread = 408;
    var startFrameCount = 8;
    var frameNumber = 1;
    var retryTime = 1000; //time interval after which openStream will try open the stream pipeline
    var FPS;
    openStream(streamingUrl, retryTime, function (vCap) {
        console.log("OpenStream response :: ", vCap);
        //get FPS of stream using OpenCV. If not works calculate it.
        FPS = vCap.get(5);
        if (FPS > 0) {
            callback(vCap, FPS);
        }
        else {
            while (frameNumber != framesToread) {
                let frame = vCap.read();
                if (frameNumber == startFrameCount)
                    var start = new Date().getTime();

                if (frameNumber == framesToread - 1) {
                    var end = new Date().getTime();
                    FPS = parseInt((framesToread - startFrameCount) / ((end - start) / 1000));
                    console.log("FPS    ::", FPS);
                    callback(vCap, FPS);
                }
                frameNumber += 1;
            }
        }
    });
}

/**
 * 
 * @param {*string} parsedJson camera details to stream camera 
 * @param {*} cameraFolder destination folder for images
 */
var startLiveStreaming = function (parsedJson, cameraFolder) {

    console.log("CALL -startLiveStreaming");
    console.log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
    // console.log("Starting stream with data::", JSON.stringify(parsedJson));

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
    var deviceType = parsedJson.deviceType;
    var wayToCommunicate = parsedJson.wayToCommunicate;
    var expectedFPS = parsedJson.computeEngineFps;

    var vCap;

    switch (deviceType) {
        case 'IP':
            console.log("Checking IP camera");
            streamingUrl = "uridecodebin uri=" + streamingUrl + " ! videoconvert ! videoscale ! appsink";
    }

    var faceCountZero = 0;
    //fps:frames per second, interval: call to function in interval {vCap.get(5); vCap.get(CV_CAP_PROP_FPS)}
    //calculate fps
    calculateFPS(streamingUrl, function (vCap, fps) {
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
                    var camData = {
                        intervalObj: camInterval,
                        vCapObj: vCap
                    }
                    liveCameraMap.set(camId, camData);
                    liveCamIntervalArray.push({
                        camId: camId,
                        intervalObj: camInterval,
                        vCapObj: vCap
                    });
                    sendImagesToggleMap.set(camId, 0);
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
                        cv.imwrite(imageFullPath, frame, [parseInt(cv.IMWRITE_JPEG_QUALITY), config.imageQuality]);

                        //send to respective compute engine
                        switch (wayToCommunicate) {
                            case 'rsync':
                                /**
                                * to sync newly added file with compute engine's FS
                                */
                                imageTransfer.rsyncInterval(0, imageName, imageFullPath, camId, jetsonFolderPath);
                                break;

                            case 'restAPI':
                                /**
                                * to send images to cloud compute engine
                                */
                                var commonDataToSend = {
                                    'timestamp': timestamp,
                                    'feature': detectionType,
                                    'deviceName': camName,
                                    'camId': camId,
                                    'userId': userId
                                }
                                if (detectionType == "faceRecognition") {
                                    const image = frame;
                                    // detect faces
                                    const { objects, numDetections } = classifier.detectMultiScale(image.bgrToGray());
                                    // console.log('faceRects:', objects);
                                    // console.log('confidences:', numDetections);
                                    var max = Math.max.apply(null, numDetections)
                                    if (!objects.length || max < 5) {
                                        faceCountZero = faceCountZero + 1;
                                        // console.log('No faces detected--------------->', faceCountZero);
                                        commonDataToSend.imageName = imageName;
                                        commonDataToSend.bboxResults = [];
                                        commonDataToSend.totalCount = 0;
                                        commonDataToSend.imageWidth = imageConfig.ImageWidth;
                                        commonDataToSend.imageHeight = imageConfig.imageHeight;
                                        imageProcessingController.uploadImageToBlob(imageName, imageFullPath, commonDataToSend, function (faceResult) {
                                            if (faceResult) {
                                                IOThubCommunication.sendIOTHubMessage(faceResult);
                                            }
                                        });

                                    } else {
                                        // console.log('Facesdetected--------------->', faceCountZero);
                                        commonDataToSend.imageName = imageName;
                                        commonDataToSend.areaOfInterest = bboxes;
                                        commonDataToSend.imageConfig = imageConfig;
                                        imageProcessingController.uploadImageToBlob(imageName, imageFullPath, commonDataToSend, function (faceCEData) {
                                            if (faceCEData) {
                                                IOThubCommunication.sendIOTHubMessage(faceCEData, "cloudComputeImages");
                                            }
                                        });
                                    }
                                } else {
                                    commonDataToSend.imageName = imageName;
                                    commonDataToSend.areaOfInterest = bboxes;
                                    commonDataToSend.imageConfig = imageConfig;
                                    imageProcessingController.uploadImageToBlob(imageName, imageFullPath, commonDataToSend, function (cloudCEData) {
                                        if (cloudCEData) {
                                            IOThubCommunication.sendIOTHubMessage(cloudCEData, "cloudComputeImages");
                                        }
                                    });
                                }
                                break;

                            default:
                                console.log("Warning : Default Case executed ( specified way of communication not available:-  " + wayToCommunicate
                                    + " not served yet)!");
                        }
                        delete frame;
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

/** 
* to stop cameras specified
* @param {*string} message 
* @param {*function} callback 
*/
var stopCamera = function (message, callback) {
    console.log("CALL -stopCamera");
    console.log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~");

    var camIds = JSON.parse(message);
    let tempArr = liveCamIntervalArray.slice();

    // console.log("Cameras ON --", liveCameraMap);
    var camData = liveCameraMap.get(camIds[0]);
    if (camData) {
        clearInterval(camData.intervalObj);
        camData.vCapObj.release();
        liveCameraMap.delete(camIds[0]);
        console.log("Stopped Camera---", camIds[0]);
    } else {
        console.log("Camera not found to stop--", camIds[0]);
    }
};

/**
 * images toggling
 * @param {*} camId 
 * @param {*} flag 
 */
var toggleSendImageFlag = function (camId, flag) {
    sendImagesToggleMap.set(camId, flag);
    console.log("Flag Toggled to " + flag + " for camera id :", camId);
}

module.exports.createCameraFolder = createCameraFolder;
module.exports.startLiveStreaming = startLiveStreaming;
module.exports.stopCamera = stopCamera;
module.exports.openStream = openStream;
module.exports.toggleSendImageFlag = toggleSendImageFlag;
module.exports.sendImagesToggleMap = sendImagesToggleMap;
module.exports.liveCamIntervalArray = liveCamIntervalArray;
module.exports.calculateFPS = calculateFPS;
module.exports.liveCameraMap = liveCameraMap;
