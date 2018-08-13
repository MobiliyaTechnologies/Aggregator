var config = require('../config');
var imageTransfer = require('../controllers/imageTransfer');
var imageProcessingController = require('../controllers/imageProcessingController');
var imageProcessingController = require('./imageProcessingController');
var IOThubCommunication = require('../communication/IOTHub');

var fs = require('fs');
var mkdirp = require('mkdirp');
var Rsync = require('rsync');
var cv = require('opencv');
var request = require('request');
const { exec } = require('child_process');

var sendImagesToggleMap = new Map();
//to keep track of live cameras
var liveCamIntervalArray = [];

var findIPOfIPCamera = function (parsedJson, callback) {
    if (parsedJson.deviceType !== 'IP') {
        callback(parsedJson.streamingUrl);
    }
    exec("arp | grep " + parsedJson.streamingUrl + " | awk '{print $1}'", (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
        }
        var ipAddress = stdout.split("\n")[0];
        if (ipAddress) {
            streamingUrl = 'rtsp://' + ipAddress + '/onvif1';

            console.log("Generated URL--> ", streamingUrl);
            var gstStreamingUrl = "uridecodebin uri=" + streamingUrl + " ! videoconvert ! videoscale ! appsink";
            callback(gstStreamingUrl);
        } else {
            //callback(null);
        }
    });
}

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
            }
        });
    }
    if (parsedJson.deviceType == 'IP') {
        console.log("Checking IP camera");
        //findIPOfIPCamera(parsedJson, function (url) {
        //  parsedJson.streamingUrl = url;
        fps = 5;
        console.log("STREAMING URL - --", parsedJson.streamingUrl);
        callback(parsedJson, cameraFolder);
        //});
    } else {
        callback(parsedJson, cameraFolder);
    }
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
    var maxTries = 11;
    retryTime = 2000;
    console.log("**In STREAM OPENING TEST for -", streamingUrl);
    //Webcam
    if (streamingUrl.indexOf("webcam") === 0)
        streamingUrl = parseInt(streamingUrl.replace("webcam", ""));

    var retryInterval = setInterval(function () {
        var vCap = null;
        if (failflag === 0) {
            try {
                vCap = new cv.VideoCapture(streamingUrl);
                if (vCap !== null)
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
        if (failcount == maxTries) {
            clearInterval(retryInterval);
            console.log("**Reached Maximum tries ...\nCamera not able to stream-", streamingUrl);
            callback(vCap);
        }
    }, retryTime);
}

/**
 * 
 * @param {*string} parsedJson camera details to stream camera 
 * @param {*} cameraFolder destination folder for images
 */
var startLiveStreaming = function (parsedJson, cameraFolder) {

    console.log("CALL -startLiveStreaming");
    console.log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
    console.log("Starting stream with data::", JSON.stringify(parsedJson));

    var fps = 20;
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
    var wayToCommunicate = parsedJson.wayToCommunicate;
    var expectedFPS = parsedJson.computeEngineFps;
    var deviceType = parsedJson.deviceType;
    var retryTime = 1000; //time interval after which openStream will try open the stream pipeline

    //Webcam
    if (streamingUrl.indexOf("webcam") === 0) {
        streamingUrl = parseInt(streamingUrl.replace("webcam", ""));
        fps = 30;
    }
    switch (deviceType) {
        case 'IP':
            console.log("Checking IP camera");
            streamingUrl = "uridecodebin uri=" + streamingUrl + " ! videoconvert ! videoscale ! appsink";
            fps = 5;
    }

    var interval = fps;
    expectedFPS = parseInt(fps / expectedFPS);

    //open the stream
    var vCap;
    openStream(streamingUrl, retryTime, function (cap) {
        console.log("Open Stream responded as:: ", cap);
        vCap = cap;

        if (vCap != null) {
            console.log("Stream Opened Successfully with fps ::", fps);
            console.log("*Sending frames now!!\n``````````````````````````````````\n");
            var countframe = 1;
            /**
            * To stream continuous frames with interval
            */
            var camInterval = setInterval(function () {

                if (pushedInterval == false) {
                    /**To maintain live camera array */
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
                    vCap.read(function (err, frame) {
                        if (err) { console.log(err); }

                        else {
                            if (countframe % fps == 0) {
                                //countframe reset
                                countframe = 0;
                                var timestamp = new Date().getTime();
                                //composing imagename
                                var imageName = camId + "_" + detectionType + "_" + timestamp + ".jpg";
                                var imageFullPath = filePath + imageName;

                                /**to write captured image of camera into local fs */
                                frame.save(imageFullPath);
                                frame.release();
                                delete frame;

                                //send images to Backend
                                if (sendImagesToggleMap.get(camId) || parsedJson.sendImagesFlag) {
                                    var outBase64 = imageProcessingController.base64_encode(imageFullPath);
                                    //imageTransfer.sendImageRest(imageName, config.sendLiveStreamUploadURL, outBase64);
                                }
                                //send to respective compute engine
                                switch (wayToCommunicate) {
                                    case 'rsync':
                                        /**
                                        * to sync newly added file with compute engine's FS
                                        */
                                        //imageTransfer.rsyncInterval(0, imageName, imageFullPath, camId, jetsonFolderPath);
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
                                        commonDataToSend.imageName = imageName;
                                        commonDataToSend.areaOfInterest = bboxes;
                                        commonDataToSend.imageConfig = imageConfig;
                                        imageProcessingController.uploadImageToBlob(imageName, imageFullPath, commonDataToSend, function (cloudCEData) {
                                            if (cloudCEData) {
                                                IOThubCommunication.sendIOTHubMessage(cloudCEData, "cloudComputeImages");
                                            }
                                        });
                                        // imageTransfer.sendImageCloudComputeEngine(timestamp, imageFullPath, bboxes,
                                        //     imageConfig, config.cloudServiceTargetUrl, cloudServiceUrl, camName, userId, camId); // cloudServiceUrl
                                        break;

                                    default:
                                        console.log("Warning : Default Case executed ( specified way of communication not available:-  " + wayToCommunicate
                                            + " not served yet)!");
                                }
                            }
                        }
                        countframe = countframe + 1;
                    });
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
 * images toggling
 * @param {*} camId 
 * @param {*} flag 
 */
var toggleSendImageFlag = function (camId, flag) {
    sendImagesToggleMap.set(camId, flag);
    console.log("Flag Toggled to " + flag + " for camera id :", camId);
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

    tempArr.forEach(function (cam, i) {
        if (camIds.includes(cam.camId)) {
            //to remove stopped live camera 
            clearInterval(cam.intervalObj);
            if (cam.vCapObj != null) {
                //cam.vCapObj.release();
                delete cam.vCapObj;
            }
            console.log(" Stopped :: ", cam.camId);
            liveCamIntervalArray.splice(i, i + 1);
        }
    });
};

module.exports.createCameraFolder = createCameraFolder;
module.exports.startLiveStreaming = startLiveStreaming;
module.exports.stopCamera = stopCamera;
module.exports.openStream = openStream;
module.exports.toggleSendImageFlag = toggleSendImageFlag;
