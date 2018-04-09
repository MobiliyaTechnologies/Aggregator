var base64_encode = require('./imageProcessingController').base64_encode;
var Rsync = require('rsync');
var fs = require('fs');
var config = require('../config');
var request = require('request');
var parseJson = require('parse-json');


/**
 * common function to send Images using MQTT in base64 format
 * @param {*} imageName 
 * @param {*} format 
 * @param {*} mqttTopic 
 * @param {*} imageFullPath 
 * @param {*} userId 
 * @param {*} streamingUrl 
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

var sendImageRest = function (imageName, sendRawImageuri,
    imageFullPath = undefined, userId = undefined, streamingUrl = undefined, camId) {
    //convert to base64
    base64Image = base64_encode(imageFullPath);
    base64Image = "data:image/jpg;base64, " + base64Image;

    //Image and data          
    var imgJsonBody = {
        userId: userId,
        imgName: imageFullPath,
        imgBase64: base64Image,
        camId: camId,
        streamingUrl:streamingUrl
    };
    var options = {
        uri: sendRawImageuri,
        method: 'POST',
        json: imgJsonBody
    };
    console.log(sendRawImageuri);
    request(options, function (error, response, body) {
        console.log(body)
        if (!error && response.statusCode == 200) {
            console.log("Raw Image Posted"); 
        } else {
            console.log("Error in posting Raw Image:", error);
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
    cloudServiceTargetUrl, cloudServiceUrl, camName, userId) {
    console.log("**SENDImageTOCloud::\n", timestamp, imageFullPath, bboxes, imageConfig,
        cloudServiceTargetUrl, cloudServiceUrl, camName, userId);

    //console.log("Cloud Service URL ::", cloudServiceUrl);
    //console.log("IMG config : ", imageConfig);

    //connect with cloudServiceUrl
    var requestObj = request.post(cloudServiceUrl, function (err, res, body) {
        if (err) {
            console.log('Failed to connect to compute engine:', err);
        } else { console.log('Compute engine respond', body.result); }
    });

    //send the image
    var form = requestObj.form();
    form.append('areaOfInterest', JSON.stringify(bboxes));
    form.append('deviceName', camName);
    form.append('targetUrl', cloudServiceTargetUrl);
    form.append('timestamp', timestamp);
    form.append('imageConfig', JSON.stringify(imageConfig));
    form.append('userId', userId);

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
            }
        });
    }
}

/**
 * sending images via API
 * @param {*} imgName 
 * @param {*} imgPath 
 */
var sendImages = function (imgName, imgPath) {
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
        }
    });
}

module.exports.sendImageCloudComputeEngine = sendImageCloudComputeEngine;
module.exports.sendImages = sendImages;
module.exports.rsyncInterval = rsyncInterval;
module.exports.sendImageBase64MQTT = sendImageBase64MQTT;
module.exports.sendImageRest = sendImageRest;