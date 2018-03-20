var config = require('../config');
var base64_encode = require('./imageProcessingController').base64_encode;

var parseJson = require('parse-json');
var fs = require('fs');
var mkdirp = require('mkdirp');
var Rsync = require('rsync');
const cv = require('opencv4nodejs');
var request = require('request');

//to keep track of live cameras
var liveCamIntervalArray = [];
var sendImagesToggleMap = new Map();

/**
* to create Cam<CamId> folder and call startStreaming
* @param {*string} message 
* @param {*function} callback 
*/
var createCameraFolder = function (message, callback) {
    console.log("CALL -createCameraFolder");
    console.log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~");

    var parsedJson = parseJson(message);

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
        if (failcount == maxTries) {
            clearInterval(retryInterval);
            console.log("**Reached Maximum tries ...\nCamera not able to stream-", streamingUrl);
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

    var fps;
    //fps:frames per second, interval: call to function in interval {vCap.get(5); vCap.get(CV_CAP_PROP_FPS)}

    var pushedInterval = false;
    //filepath to stream images
    var filePath = cameraFolder + "/";
    // if(parsedJson.streamingUrl==undefined || (parsedJson.jetsonFolderPath==undefined || parsedJson.cloudServiceUrl))
    //     return;
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
    var cloudServiceUrl = parsedJson.cloudServiceUrl;
    var retryTime = 1000; //time interval after which openStream will try open the stream pipeline

    //Setting FPS 
    switch (detectionType) {
        case 'faceDetection':
            fps = 25 * 3;
            break;
        case 'humanDetection':
        case 'objectDetection':
            fps = 25;
            break;
        case 'faceRecognition':
            fps = 25 * 10;
            break;
        default:
            fps = 25;
            break;
    }
    var interval = fps;

    //open the stream
    var vCap;
    var sentImage = 0;var firstImage=1;
    openStream(streamingUrl, retryTime, function (cap) {
        console.log("Open Stream responded as:: ", cap);
        vCap = cap;

        if (vCap != null) {
            console.log("Stream Opened Successfully with fps ::", fps);
            console.log("*Sending frames now!!\n``````````````````````````````````\n");
            var countframe = 0;
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
                    sendImagesToggleMap.set(camId,0);
                    pushedInterval = true;
                }
                /**reading next frame */
                if (vCap != null) {
                    let frame = vCap.read();
                    if (countframe % fps == 0) {
                        //countframe reset
                        countframe = 0;
                        var timestamp = new Date().getTime();
                        //composing imagename
                        var imageName = camId + "_" + detectionType + "_" + timestamp + ".jpg";
                        var imageFullPath = filePath + imageName;

                        /**to write captured image of camera into local fs */
                        cv.imwrite(imageFullPath, frame, [parseInt(cv.IMWRITE_JPEG_QUALITY), 50]);

                        // if (sentImage === 1 || firstImage===1) {
                            // sentImage=0;
                            //Send images to Backend
                        if(sendImagesToggleMap.get(camId) || parsedJson.sendImagesFlag)
                        {
                            sendImages(imageName, imageFullPath, function () {
                                sentImage = 1;
                            });
                        }
                            
                        // }
                        //send to respective compute engine
                        switch (detectionType) {
                            case 'humanDetection':
                            case 'objectDetection':
                                /**
                                * to sync newly added file with compute engine's FS
                                */
                                rsyncInterval(0, imageName, imageFullPath, camId, jetsonFolderPath);
                                //deleting the sent file 
                                //console.log("IMG path :: ", imageFullPath);
                                break;

                            case 'faceDetection':
                                /**
                                * to send images to cloud compute engine
                                */
                                sendImageCloudComputeEngine(timestamp, imageFullPath, bboxes, imageConfig, config.cloudServiceTargetUrl, cloudServiceUrl,camName); // cloudServiceUrl
                                break;

                            case 'faceRecognition':
                                /**
                                * to send images to cloud compute engine
                                */
                                sendImageCloudComputeEngine(timestamp, imageFullPath, bboxes, imageConfig, config.cloudServiceTargetUrl, cloudServiceUrl,camName);
                                break;

                            default:
                                console.log("Warning : Default Case executed ( specified feature:-  " + detectionType + " not served yet)!");
                        }


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
 * to send images to Cloud Compute Engine using API post
 * @param {*} timestamp image timestamp
 * @param {*} imageFullPath 
 * @param {*} bboxes AOI for detection
 * @param {*} imageConfig configuration for managing co-ordinates
 * @param {*} cloudServiceTargetUrl url of cloud api to be used by cloud compute engine
 * @param {*} cloudServiceUrl url of cloud compute engine
 */
var sendImageCloudComputeEngine = function (timestamp, imageFullPath, bboxes, imageConfig, cloudServiceTargetUrl, cloudServiceUrl,camName) {
    //console.log("**SENDImageTOCloud");

    //console.log("Cloud Service URL ::", cloudServiceUrl);
    //console.log("IMG config : ", imageConfig);

    //connect with cloudServiceUrl
    var requestObj = request.post(cloudServiceUrl, function optionalCallback(err, httpResponse, body) {
        if (err) {
            return console.error('Failed to connect to compute engine:', err);
        }
        console.log('Compute engine respond : ', parseJson(body).result);
    });

    //send the image
    var form = requestObj.form();
    form.append('areaOfInterest', JSON.stringify(bboxes));
    form.append('deviceName', camName);
    form.append('targetUrl', cloudServiceTargetUrl);
    form.append('timestamp', timestamp);
    form.append('imageConfig', JSON.stringify(imageConfig));

    form.append('file',
        fs.createReadStream(imageFullPath).on('end', function () {
            console.log("***File sent to compute engine***");
        })
    );
};

/**
 * rsync images to compute engine's FS
 * @param {*} timeInterval 
 * @param {*} imgName 
 * @param {*} imgPath 
 * @param {*} camId 
 * @param {*} jetsonFolderPath 
 */
var rsyncInterval = function (timeInterval, imgName, imgPath, camId, jetsonFolderPath) {

    //console.log("CAMERA ID  ::", camId);
    //console.log("RSYNC TARGET ::", jetsonFolderPath);

    //CMD
    var rsync = new Rsync()
        .shell('ssh')
        .flags('avz')
        .source(imgPath)
        .destination(jetsonFolderPath + camId);

    //if DWARPED image send it after specified interval
    if (timeInterval !== 0) {
        setTimeout(function () {
            //console.log("\n\nRSYNC PATH______________________", imgPath);
            rsync.execute(function (error, code, cmd) {
                if (error)
                    console.log("Error in rsync ::", error);
                else {
                    clearInterval(rsyncInterval);
                    console.log("--Rsync done of ", imgName);
                }
            });
        }, timeInterval);
    }
    //if normal image send it directly
    else {
        rsync.execute(function (error, code, cmd) {
            //console.log("In non-mobile camera!!",cmd);
            if (error)
                console.log("Error in rsync ::", error);
            else {
                console.log("--Rsync done of ", imgName);
                clearInterval(rsyncInterval);
            }
        });
    }
}

/**
 * sending images via API
 * @param {*} imgName 
 * @param {*} imgPath 
 */
var sendImages = function (imgName, imgPath, callback) {

    //console.log("SEND IMAGES :: Img name : " + imgName + " Img Path :" + imgPath);

    //convert to base64
    var base64Img = base64_encode(imgPath);
    base64Img = "data:image/jpg;base64, " + base64Img;

    //console.log("base64 img ::: ", base64Img);
    var imgJsonBody = {
        imgName: imgName,
        imgBase64: base64Img
    };

    var options = {
        rejectUnauthorized: false,
        url: config.sendLiveStreamUploadURL,
        method: 'POST',
        json: imgJsonBody
    }
    request(options, function (error, body, response) {
        if (error) {
            console.log("ERROR in posting image::" + error);
        }
        else {
            //fs.unlinkSync(imgPath);
            console.log("++BACKEND: Response for image:: " + imgJsonBody.imgName + " => " + JSON.stringify(body.statusCode));
            callback();
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

    var camIds = parseJson(message);
    let tempArr = liveCamIntervalArray.slice();

    tempArr.forEach(function (cam, i) {
        if (camIds.includes(cam.camId)) {
            //to remove stopped live camera 
            if (cam.vCapObj != null) {
                cam.vCapObj.release();
            }
            clearInterval(cam.intervalObj);
            console.log(" Stopped :: ", cam.camId);
            liveCamIntervalArray.splice(i, i + 1);
        }
    });
    callback(null);
};

var toggleSendImageFlag = function(camId, flag){
    sendImagesToggleMap.set(camId,flag);
    console.log("Flag Toggled to "+flag+" for camera id :",camId);
}

module.exports.createCameraFolder = createCameraFolder;
module.exports.startLiveStreaming = startLiveStreaming;
module.exports.sendImageCloudComputeEngine = sendImageCloudComputeEngine;
module.exports.sendImages = sendImages;
module.exports.rsyncInterval = rsyncInterval;
module.exports.stopCamera = stopCamera;
module.exports.openStream = openStream;
module.exports.toggleSendImageFlag = toggleSendImageFlag;
