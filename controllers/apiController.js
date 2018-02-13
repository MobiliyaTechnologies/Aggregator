var configuredMobileCam = [];

var liveStreamController = require('./liveStreamingController');
var config = require('../config');
var fs = require('fs');
var parseJson = require('parse-json');
var exec = require('child_process').exec;

var configureCamera = function (parsedJson, callback) {
    var configurationMobileCam = {
        camId: parsedJson.camId,
        imageConfig: {
            frameWidth: parsedJson.frameWidth.width,
            frameHeight: parsedJson.frameWidth.height,
            ImageWidth: parsedJson.imageWidth,
            ImageHeight: parsedJson.imageHeight
        },
        bboxes: parsedJson.boundingBox,
        jetsonFolderPath: parsedJson.jetsonCamFolderLocation,
        detectionType: parsedJson.feature,
        cloudServiceUrl: parsedJson.cloudServiceUrl
        // cloudServiceTargetUrl:pars
    };
    configuredMobileCam.push(configurationMobileCam);
    callback(null);
}

var receiveMobileImages = function (req, res) {
    console.log("Request to serve detection on mobile received :");
    if (!req.files)
        return res.status(400).send('No files were uploaded.');

    let sampleFile = req.files.file;
    console.log("&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&& File received with name :: ", req.files.file.name);

    var imageName = req.files.file.name;
    //var detectionType = req.body.detectionType;
    console.log("_____________________________________________________________________");
    console.log("IMAGE TYPE ::", req.body.flag);

    var imageType = req.body.flag;
    var camId = req.body.camId;

    var camObj = configuredMobileCam.find(camObj => camObj.camId === camId);
    var imageFolderPath = config.livestreamingCamFolder + camId;
    console.log("Mobile Camera Configuration :: ", camObj);

    if (camObj != null) {

        console.log("**Mobile camera configuration found..");
        var detectionType = camObj.detectionType;

        sampleFile.mv(imageFolderPath + '/' + imageName, function (err) {
            if (err) {
                return res.status(500).send(err);
            }
            var timestamp = new Date();
            console.log("\n\n       {{{{{{{%%%  MOBILE CAMERA IMAGE CAME AT %%%}}}}}}}}} ::" + timestamp + " NAME :::" + imageName);
            res.send({ 'result': 'Your File accepted !' });

            //fs.createReadStream(config.imageDirectory + '/' + imageName).pipe(fs.createWriteStream(camId+'.jpg'));
            if (imageType === "false") {
                console.log("No need to DEWARP  ***");

                liveStreamController.sendImages(imageName, imageFolderPath + '/' + imageName);
                sendToDetectionType(detectionType, imageName, imageFolderPath + '/' + imageName, camId, camObj);

            }
            else {
                deWrapImage(imageName, camId, camObj, imageFolderPath, function (error) {
                    console.log("\n\n");
                });
            }
        });
    }
    else {
        //to keep as raw image

        if (!fs.existsSync(config.rawImageDirectory + '/' + camId + '.jpg')) {
            if (imageType === "true") {
                sampleFile.mv(imageFolderPath + '/' + imageName, function (err) {
                    ls = exec('./fisheye -o 120 -c 521,518 -l 248,518 -r 420 320x320 ' + imageFolderPath + '/' + imageName + ' ' + config.rawImageDirectory + '/' + camId + '.jpg',
                        function (err, stdout, stderr) {
                            console.log("Raw Image DWARP DONE !");
                        });
                });
            }
            else {
                sampleFile.mv(config.rawImageDirectory + '/' + camId + '.jpg', function (err) {
                    console.log(err);
                    console.log("Raw image added");
                });
            }

        }
        console.log("Camera Is not configured..!! Please do so before ..\n\nAggregator won't forward images..!!");
        res.send({ 'result': 'Camera Is not configured..!! Please do so before ..Aggregator will not forward images!' });
    }
};

var sendToDetectionType = function (detectionType, imageName, imgPath, camId, camObj, timeInterval) {
    //send to respective compute engine
    switch (detectionType) {
        case 'humanDetection':
            /**
            * to sync newly added file with compute engine's FS
            */
            liveStreamController.rsyncInterval(timeInterval, imageName, imgPath, camId, camObj.jetsonFolderPath);
            //deleting the sent file 
            // console.log("IMG path :: ", imageFullPath);

            break;

        case 'faceDetection':
            /**
            * to send images to cloud compute engine
            */
            liveStreamController.sendImageCloudComputeEngine(new Date().getTime(), imgPath, camObj.bboxes, camObj.imageConfig, config.cloudServiceTargetUrl, camObj.cloudServiceUrl);
            break;

        case 'faceRecognition':
            /**
            * to send images to cloud compute engine
            */
            liveStreamController.sendImageCloudComputeEngine(new Date().getTime(), imgPath, camObj.bboxes, camObj.imageConfig, config.cloudServiceTargetUrl, camObj.cloudServiceUrl);
            break;

        default:
            console.log("Warning : Default Case executed ( specified feature:-  " + detectionType + " not served yet)!");
    }
}

var deWrapImage = function (imageName, camId, camObj, imageFolderPath, callback) {
    var sourcePath = imageFolderPath + '/' + imageName;

    var targetPath = [];
    var imageNameArray = imageName.split(".");
    imageNameArray.push(imageNameArray[imageNameArray.length - 1]);

    imageNameArray[imageNameArray.length - 2] = "_1.";
    targetPath.push(imageNameArray.join(""));
    imageNameArray[imageNameArray.length - 2] = "_2.";
    targetPath.push(imageNameArray.join(""));
    imageNameArray[imageNameArray.length - 2] = "_3.";
    targetPath.push(imageNameArray.join(""));
    imageNameArray[imageNameArray.length - 2] = "_4.";
    targetPath.push(imageNameArray.join(""));
    console.log("Renamed Images are  ::", targetPath);

    ls = exec('./fisheye -o 120 -c 521,518 -l 248,518 -r 420 320x320 ' + sourcePath + ' ' + config.imageTargetDirectory + '/' + targetPath[0],
        function (err, stdout, stderr) {
            console.log("-----------------------------ONE DWARP at " + new Date() + " of IMAGE ::" + targetPath[0]);
            // rsyncInterval(0, targetPath[0], config.imageTargetDirectory + '/' + targetPath[0], camId, camObj.jetsonFolderPath);
            liveStreamController.sendImages(targetPath[0], config.imageTargetDirectory + '/' + targetPath[0]);
            sendToDetectionType(camObj.detectionType, targetPath[0], config.imageTargetDirectory + '/' + targetPath[0], camId, camObj, 0);
        });

    ls = exec('./fisheye -o 120 -c 521,518 -l 521,248 -r 420 320x320 ' + sourcePath + ' ' + config.imageTargetDirectory + '/' + targetPath[1],
        function (err, stdout, stderr) {
            console.log("-----------------------------TWO DWARP", new Date() + " of IMAGE ::" + targetPath[1]);
            // rsyncInterval(3000, targetPath[1], config.imageTargetDirectory + '/' + targetPath[1], camId, camObj.jetsonFolderPath);
            liveStreamController.sendImages(targetPath[1], config.imageTargetDirectory + '/' + targetPath[1]);
            sendToDetectionType(camObj.detectionType, targetPath[1], config.imageTargetDirectory + '/' + targetPath[1], camId, camObj, 3000);
        });

    ls = exec('./fisheye -o 120 -c 521,518 -l 521,766 -r 420 320x320 ' + sourcePath + ' ' + config.imageTargetDirectory + '/' + targetPath[2],
        function (err, stdout, stderr) {
            console.log("-----------------------------THREE DWARP at ", new Date() + " of IMAGE ::" + targetPath[2]);
            // rsyncInterval(6000, targetPath[2], config.imageTargetDirectory + '/' + targetPath[2], camId, camObj.jetsonFolderPath);
            liveStreamController.sendImages(targetPath[2], config.imageTargetDirectory + '/' + targetPath[2]);
            sendToDetectionType(camObj.detectionType, targetPath[2], config.imageTargetDirectory + '/' + targetPath[2], camId, camObj, 6000);
        });

    ls = exec('./fisheye -o 120 -c 521,518 -l 766,500 -r 440 320x320 ' + sourcePath + ' ' + config.imageTargetDirectory + '/' + targetPath[3],
        function (err, stdout, stderr) {
            console.log("-----------------------------FOUR DWARP at ", new Date() + " of IMAGE ::" + targetPath[3]);
            // rsyncInterval(9000, targetPath[3], config.imageTargetDirectory + '/' + targetPath[3], camId, camObj.jetsonFolderPath);
            liveStreamController.sendImages(targetPath[3], config.imageTargetDirectory + '/' + targetPath[3]);
            sendToDetectionType(camObj.detectionType, targetPath[3], config.imageTargetDirectory + '/' + targetPath[3], camId, camObj, 9000);
        });
    callback(null);
}

/** 
* to stop cameras specified
* @param {*string} message 
* @param {*function} callback 
*/
var stopMobileCam = function (message, callback) {
    console.log("CALL -stopCamera");
    console.log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~");

    var camIds = parseJson(message);

    let tempMobArr = configuredMobileCam.slice();
    tempMobArr.forEach(function (mobCam, i) {
        if (camIds.includes(mobCam.camId)) {
            console.log("Stoped mobile cam ", mobCam);
            configuredMobileCam.splice(i, i + 1);
        }
    });

    callback(null);
};

module.exports.stopMobileCam = stopMobileCam;
module.exports.configureCamera = configureCamera;
module.exports.receiveMobileImages = receiveMobileImages;