var Rsync = require('rsync');
var fs = require('fs');
var request = require('request');

var config = require('../config');
var base64_encode = require('./imageProcessingController').base64_encode;

/**
 * send image using Rest
 * @param {*} imageName 
 * @param {*} sendRawImageuri 
 * @param {*} imageFullPath 
 * @param {*} userId 
 * @param {*} streamingUrl 
 * @param {*} camId 
 */
var sendImageRest = function (imageName, sendImageuri, outBase64,
    camId, userId = undefined, streamingUrl = undefined) {
    base64Image = "data:image/jpg;base64, " + outBase64;

    if (userId) {
        //Image and data          
        var imgJsonBody = {
            userId: userId,
            imgName: imageName,
            imgBase64: base64Image,
            camId: camId,
            streamingUrl: streamingUrl
        };
    }
    else {
        var imgJsonBody = {
            imgName: imageName,
            imgBase64: base64Image
        };
    }

    var options = {
        uri: sendImageuri,
        method: 'POST',
        json: imgJsonBody
    };
    request(options, function (error, response, body) {
        if (!error) {
            if (userId) {
                console.log("Raw Image Posted");
            }
            else {
                console.log("++BACKEND: " + imgJsonBody.imgName);
            }
        } else {
            console.log("Error in posting Image:", error);
            // console.log(response);
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
var sendImageCloudComputeEngine = function (timestamp, imageFullPath, bboxes, imageConfig,
    cloudServiceTargetUrl, cloudServiceUrl, camName, userId, camId) {
    // console.log("**SENDImageTOCloud::\n", timestamp, imageFullPath, bboxes, imageConfig,
    //     cloudServiceTargetUrl, cloudServiceUrl, camName, userId);

    //console.log("Cloud Service URL ::", cloudServiceUrl);
    console.log("IMG config : ", imageFullPath);

    var requestObj = request.post(cloudServiceUrl, function (err, res, body) {
        if (err) {
            console.log('Failed to connect to compute engine:', err);
        } else { console.log('Compute engine respond', body.message); }
    });

    //send the image
    var form = requestObj.form();
    form.append('areaOfInterest', JSON.stringify(bboxes));
    form.append('deviceName', camName);
    form.append('targetUrl', cloudServiceTargetUrl);    //result url of backend
    form.append('timestamp', timestamp);
    form.append('imageConfig', JSON.stringify(imageConfig));
    form.append('userId', userId);
    form.append('camId', camId);
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
                    console.log("--Rsync ", imgName);
                }
            });
        }, timeInterval);
    }
    //if normal image send it directly
    else {
        rsync.execute(function (error, code, cmd) {
            if (error)
                console.log("Error in rsync ::", error);
            else {
                console.log("--Rsync: Response for image:: ", imgName);
            }
        });
    }
}

var sendFaceResult = function (jsonData, uploadResultsURL) {
    var options = {
        uri: uploadResultsURL,
        method: 'POST',
        json: jsonData
    };
    request(options, function (error, response, body) {
        if (!error) {
            console.log("++BACKEND: Response for Face Result::  => " + JSON.stringify(body.message));
        } else {
            console.log("Error in posting FaceREsult:", error);
            // console.log(response);
        }
    });
}

module.exports.sendImageCloudComputeEngine = sendImageCloudComputeEngine;
module.exports.rsyncInterval = rsyncInterval;
module.exports.sendImageRest = sendImageRest;
module.exports.sendFaceResult = sendFaceResult;