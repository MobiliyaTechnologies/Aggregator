var config = require('../config');
var imageProcessingController = require('./imageProcessingController');
var liveStreamController = require('./liveStreamingController');
var imageTransfer = require('../controllers/imageTransfer');
var base64ToImage = require('./imageProcessingController').base64ToImage;
var base64_encode = require('./imageProcessingController').base64_encode;
var fs = require('fs');
var mkdirp = require('mkdirp');

var sendMobileCameraImages = function (parsedJson, cameraFolder) {

    //console.log("JSON ::::::::::::", (parsedJson));
    var camId = parsedJson.camId;
    var detectionType = parsedJson.feature;
    // console.log("Detection Type ::", detectionType);
    var jetsonFolderPath = parsedJson.jetsonCamFolderLocation;
    // console.log("JetsonFolderPath ::", jetsonFolderPath);

    var wayToCommunicate = parsedJson.wayToCommunicate;
    var cloudServiceUrl = parsedJson.cloudServiceUrl;
    var imageType = parsedJson.imageType;
    var userId = parsedJson.userId;

    var imageName = parsedJson.blobName;

    var filePath = cameraFolder + "/";
    var imageFullPath = filePath + imageName;

    //console.log("Image full path ::::::::::::", imageFullPath);
    imageProcessingController.downloadBlob(imageName, imageFullPath, function () {
        if (imageType == "Mobile360") {
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
            //call to dwarp
            imageProcessingController.deFishEyeImage(imageName, imageFullPath,
                destinationImageFolderPath, function (dwarpedImageName, destinationImageFullPath) {
                    //console.log("+++++++++++++++++++++++++++++", destinationImageFullPath);

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
                            // imageTransfer.sendImageCloudComputeEngine(timestamp, destinationImageFullPath, bboxes, imageConfig, 
                            //     config.cloudServiceTargetUrl, cloudServiceUrl, camName, userId); // cloudServiceUrl
                            break;

                        default:
                            console.log("Warning : Default Case executed ( specified way of communication not available:-  " + wayToCommunicate
                                + " not served yet)!");
                    }
                })
        }
        else {
            var outBase64 = base64_encode(imageFullPath);
            imageTransfer.sendImageRest(imageName, config.sendLiveStreamUploadURL, outBase64, camId);

            //send to respective compute engine
            switch (wayToCommunicate) {
                case 'rsync':
                    /**
                    * to sync newly added file with compute engine's FS
                    */
                    imageTransfer.rsyncInterval(0, imageName, imageFullPath,
                        camId, jetsonFolderPath);
                    break;

                case 'restAPI':
                    /**
                    * to send images to cloud compute engine
                    */
                    imageTransfer.sendImageCloudComputeEngine(timestamp, imageFullPath, bboxes, imageConfig, config.cloudServiceTargetUrl, cloudServiceUrl, camName, userId); // cloudServiceUrl
                    break;

                default:
                    console.log("Warning : Default Case executed ( specified way of communication not available:-  " + wayToCommunicate
                        + " not served yet)!");
            }
        }
    });
}

module.exports.sendMobileCameraImages = sendMobileCameraImages;

