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

/**
* to receive bboxes and call startstreaming
* @param {*string} message 
* @param {*function} callback 
*/
var createCameraFolder = function (message, callback) {
    console.log("CALL -boundingBox");
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

var openStream = function (streamingUrl, retryTime, callback) {
    var failflag = 0;
    var failcount = 0;

    console.log("In STREAM OPENING TEST **");
    var returnVcap;
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
                console.log("FAILCOUNT  ::", failcount);
                console.log("Error in opening stream :\nERROR::\n ", error);
                console.log("___________________________________________________________________")
            }
        }
        if (failflag == 1) {
            callback(vCap);
            clearInterval(retryInterval);
        }
        if (failcount == 4) {
            clearInterval(retryInterval);
            console.log("Reached Maximum tries ...\nCamera not able to stream!!");
        }
    }, retryTime);
}

/**
 * 
 * @param {*string} parsedJson camera details to stream camera 
 */
var startLiveStreaming = function (parsedJson, cameraFolder) {
    console.log("Starting stream with ::",parsedJson);
    var fps;
    //fps:frames per second, interval: call to function in interval
    // vCap.get(5);      //vCap.get(CV_CAP_PROP_FPS)
    var pushedInterval = false;
    //filepath to stream images
    var filePath = cameraFolder + "/";

    console.log("CALL -startLiveStreaming");
    console.log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~");

    var streamingUrl = parsedJson.streamingUrl;
    var camId = parsedJson.camId;
    var detectionType = parsedJson.feature;
    var jetsonFolderPath = parsedJson.jetsonCamFolderLocation;
    var bboxes = parsedJson.boundingBox;
    var retryTime = 1000; //time interval after which openStream will try open the stream pipeline

    //Setting FPS 
    switch (detectionType) {
        case 'faceDetection':
            fps = 25 * 3;
            break;
        case 'humanDetection':
            fps = 25;
            break;
        default:
            fps = 25;
            break;
    }
    var interval = fps;

    //open the stream
    var vCap;
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

                        //send to respective compute engine
                        switch (detectionType) {
                            case 'humanDetection':
                                /**
                                * to sync newly added file with compute engine's FS
                                */
                                rsyncInterval(0, imageName, imageFullPath, camId, jetsonFolderPath);
                                //deleting the sent file 
                                console.log("IMG path :: ", imageFullPath);

                                break;

                            case 'faceDetection':
                                /**
                                * to send images to cloud compute engine
                                */
                                sendImageCloudComputeEngine(timestamp, imageFullPath, bboxes, imageConfig, cloudServiceTargetUrl, cloudServiceUrl);
                                break;

                            case 'faceRecognition':
                                /**
                                * to send images to cloud compute engine
                                */
                                sendImageCloudComputeEngine(timestamp, imageFullPath, bboxes, imageConfig, cloudServiceTargetUrl, cloudServiceUrl);
                                break;

                            default:
                                console.log("Warning : Default Case executed ( specified feature:-  " + detectionType + " not served yet)!");
                        }

                        //Send images to Backend
                        sendImages(imageName, imageFullPath);
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
 * 
 * @param {*} timestamp 
 * @param {*} imageFullPath 
 * @param {*} bboxes 
 */
var sendImageCloudComputeEngine = function (timestamp, imageFullPath, bboxes, imageConfig, cloudServiceTargetUrl, cloudServiceUrl) {
    var requestObj = request.post(cloudServiceUrl, function optionalCallback(err, httpResponse, body) {
        if (err) {
            return console.error('Failed to connect to compute engine:', err);
        }
        console.log('Upload successful!  Compute engine respond : ', body);
    });
    var form = requestObj.form();
    console.log("IMG config : ", imageConfig);
    form.append('areaOfInterest', JSON.stringify(bboxes));
    form.append('targetUrl', cloudServiceTargetUrl);
    form.append('timestamp', timestamp);
    form.append('imageConfig', JSON.stringify(imageConfig));
    form.append('file',
        fs.createReadStream(imageFullPath).on('end', function () {
            console.log("***File sent to compute engine***");
        })
    );
};

var rsyncInterval = function (timeInterval, imgName, imgPath, camId, jetsonFolderPath) {

    // console.log("******************** :" + './' + camId + '.jpg');
    //if (!fs.existsSync('./'+camId+'.jpg')) {
    // fs.createReadStream(imgPath).pipe(fs.createWriteStream(camId + '.jpg'));
    //}

    console.log("CAMERA ID  ::", camId);
    console.log("RSYNC TARGET ::", jetsonFolderPath);
    var rsync = new Rsync()
        .shell('ssh')
        .flags('avz')
        .source(imgPath)
        .destination(jetsonFolderPath + camId);

    if (timeInterval !== 0) {
        setTimeout(function () {
            // console.log("\n\nRSYNC PATH______________________", imgPath);
            rsync.execute(function (error, code, cmd) {
                if (error)
                    console.log("Error in rsync ::", error);
                else {
                    clearInterval(rsyncInterval);
                    console.log("Rsync done !");
                }
            });
        }, timeInterval);
    }
    else {
        rsync.execute(function (error, code, cmd) {
            console.log("In non-mobile camera!!",cmd);
            if (error)
                console.log("Error in rsync ::", error);
            else {
                console.log("Rsync done !");
                clearInterval(rsyncInterval);
            }
        });
    }
}

var sendImages = function (imgName, imgPath) {

    console.log("SEND IMAGES :: Img name : " + imgName + " Img Path :" + imgPath);
    var base64Img = base64_encode(imgPath);
    base64Img = "data:image/jpg;base64, " + base64Img;
    // console.log("IMG ::: ", base64Img);
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
            // fs.unlinkSync(imgPath);
            console.log("Response for image:: " + imgJsonBody.imgName + " => " + JSON.stringify(body.statusCode));
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

module.exports.createCameraFolder = createCameraFolder;
module.exports.startLiveStreaming = startLiveStreaming;
module.exports.stopCamera = stopCamera;
module.exports.openStream = openStream;
