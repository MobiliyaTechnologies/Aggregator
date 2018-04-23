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
var sendImageRest = function (imageName,sendImageuri,outBase64,
    camId, userId = undefined, streamingUrl = undefined) {
    base64Image = "data:image/jpg;base64, " + outBase64;

    if (userId && streamingUrl) {
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
            if (userId && streamingUrl) {
                console.log("Raw Image Posted");
            }
            else{
                console.log("++BACKEND: Response for image:: " + imgJsonBody.imgName + " => " + JSON.stringify(body.statusCode));
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
                    console.log("--Rsync done of ", imgName);
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


/**
 * common function to send Images using MQTT in base64 format
 * @param {*} imageName 
 * @param {*} format 
 * @param {*} mqttTopic 
 * @param {*} imageFullPath 
 * @param {*} userId 
 * @param {*} streamingUrl 
 * @param {*} camId
 */
var sendImageBase64MQTT = function (imageName, format, mqttTopic,
    imageFullPath = undefined, userId = undefined, streamingUrl = undefined, camId) {

    if (format != "base64") {
        //convert to base64
        base64Image = base64_encode(imageFullPath);
    }
    base64Image = "data:image/jpg;base64, " + base64Image;

    //Image and data          
    var imgJsonBody = {
        userId: userId,
        imgName: imageFullPath,
        imgBase64: base64Image,
        camId: camId
    };
    //MQTT APPROACH
    var imgJsonBodyString = JSON.stringify(imgJsonBody);
    var mqttClient = require('../mqtt/mqttCommunication').mqttClient;
    mqttClient.publish(mqttTopic, imgJsonBodyString);
}

module.exports.sendImageCloudComputeEngine = sendImageCloudComputeEngine;
module.exports.rsyncInterval = rsyncInterval;
module.exports.sendImageBase64MQTT = sendImageBase64MQTT;
module.exports.sendImageRest = sendImageRest;