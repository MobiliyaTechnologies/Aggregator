var config = require('./config');
var path = require('path');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cors = require('cors');
var parseJson = require('parse-json');
const fs = require('fs');
var exec = require('child_process').exec;
var mkdirp = require('mkdirp');
var mqtt = require('mqtt');
var request = require('request');
const cv = require('opencv4nodejs');
var jsonSize = require('json-size');
var Rsync = require('rsync');

//_________________SERVER CONFIGURATION_________________
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

var port = config.port;
app.listen(port, function () {
    console.log('\n=========PROJECT HEIMDALL=========\n\n**SERVER STATUS :: \n	Project Heimdall Server is Available to Respond!!\n	Listening on port :: ', port);
});

var liveCamIntervalArray = [];

//Connect MQTT Broker
var MQTTBroker = config.mqttBroker;
var client = mqtt.connect(MQTTBroker);

//Subscriptions: number_of_topics:5
client.on('connect', function () {
    console.log("**CLOUD BROKER STATUS :: \n	MQTT broker connected!\n-----------------------------------\n");
    client.subscribe('/');
    client.subscribe('addCamera');
    client.subscribe('getRawImage');
    client.subscribe('cameraUrls');
    client.subscribe('stopCamera');
    client.subscribe('boundingBox');
});

client.on('reconnect', function () {
    console.log("\n**BROKER STATUS :: \n  Trying to  reconnect MQTT broker!\n-----------------------------------\n");
});

client.on('close', function () { console.log("\n**BROKER STATUS :: \n     CLOSED connection with MQTT broker!\n-----------------------------------\n"); });
//_________________SERVER CONFIGURATION  DONE_________________

//_________________Handling Messages_________________

client.on('message', function (topic, message) {
    // message is Buffer
    console.log("DATA RECEIVED ON TOPIC :: ", topic);
    switch (topic) {
        case '/':
            {
                console.log("MQTT==================Project Heimdall Aggregator Server Available to Respond!!\n-----------------------------------\n");
                break;
            }
        case 'addCamera':
            {
                var newDevice = message.toString();
                addCamera(newDevice);
                console.log("MQTT==================addCamera Done!!\n-----------------------------------\n");
                break;
            }
        case 'getRawImage':
            {
                var sendData = message.toString();
                var parsedJson = parseJson(sendData);
                var camId = parsedJson.camId;
                getRawImage(message,function(error){
                if(!error){
                       console.log("MQTT==================getRawImage Done!!\n-----------------------------------\n");
                    }
                });

                
                break;
            }
        case 'cameraUrls':
            {
                cameraUrls(JSON.parse(message.toString()), function (resultArray) {
                    //console.log("Publishing Online Devices....",resultArray)
                    client.publish("cameraStatus", JSON.stringify(resultArray));
                    console.log("MQTT==================cameraUrls Done!!\n-----------------------------------\n");
                });
                break;
            }

        case 'boundingBox':
            {
                var sendData = message.toString();
                var parsedJson = parseJson(sendData);

                //STOP camera call
                boundingBox(sendData, function (camId, detectionType, streamingUrl, bboxes, cameraFolder) {
                    startLiveStreaming(camId, detectionType, streamingUrl, bboxes, cameraFolder);
                    console.log("MQTT==================boundingBox Done!!\n-----------------------------------\n");
                });

                break;
            }

        case 'stopCamera':
            {
                var camIds = message.toString();
                console.log("\n*Stop these cameras ::", JSON.stringify(camIds));
                stopCamera(camIds, function (error) {
                    if (!error) {
                        console.log("MQTT==================Stopped the cameras\n-----------------------------------\n");
                    }
                });
                break;
            }

        default:
            {
                console.log("\n Default ::  Topic:: " + topic + " not handled!!");
            }
    }
});

/**
 * creating Base directory for images
 */
if (!fs.existsSync(config.camFolder)) {
    mkdirp(config.camFolder, function (err) {
        if (err) {
            console.log(err);
        } else
            console.log("Base directory created :", config.camFolder);
    });
}

//________________________Functions________________________
/**
 * to test device if it can stream 
 * @param {*string} message 
 */
var addCamera = function (message) {
    console.log("CALL -addCamera");
    console.log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~");

    var parsedJson = parseJson(message);
    var streamingUrl = parsedJson.streamingUrl;
    console.log("DEVICE URL to test::", streamingUrl);

    try {
        const vCap = new cv.VideoCapture(streamingUrl);
        if (vCap !== null) {
            console.log("Camera device can stream!");
            var deviceResult = { "camdetails": parsedJson, "flag": 1 };
        }
    }
    //console.log("  Device Test Results::", message);
    catch (err) {
        console.log(err);
        var deviceResult = { "camdetails": parsedJson, "flag": 0 };
    }
    var strdeviceResult = JSON.stringify(deviceResult);
    //console.log("Result::", strdeviceResult);
    client.publish('addCameraResponse', strdeviceResult);
}

/**
 * to convert image to base64 format
 * @param {*string} file image filepath to be converted to base64  
 */
var base64_encode = function (file) {
    // read binary data
    var bitmap = fs.readFileSync(file);
    // convert binary data to base64 encoded string
    return new Buffer(bitmap).toString('base64');
}

/**
 * to get raw image of camera device
 * @param {*string} message camera device data to get raw image 
 */
var getRawImage = function (message) {
    console.log("CALL -getRawImage");
    console.log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
    parsedJson = parseJson(message);

    var feature = parsedJson.feature;
    var camId = parsedJson.cameraId;
    var streamingUrl = parsedJson.streamingUrl;

    try {
        //open the stream
        const vCap = new cv.VideoCapture(streamingUrl);
        if (vCap != null) {
            console.log("*Opened the stream :", streamingUrl);

            let raw = vCap.read();
            var rawImgName = "./" + camId + ".jpg";
            //write image to local FS
            cv.imwrite(rawImgName, raw, [parseInt(cv.IMWRITE_JPEG_QUALITY), 50]);
            //convert to base64
            var base64Raw = base64_encode(rawImgName);
            base64Raw = "data:image/jpg;base64, " + base64Raw;

            //Sync          
            var rawJsonBody = {
                imgName: rawImgName,
                imgBase64: base64Raw
            };
            //MQTT APPROACH
            var rawJsonBodyString = JSON.stringify(rawJsonBody);
            client.publish('rawMQTT', rawJsonBodyString);
            //HTTP
            /*
            var options = {
                url: config.getRawImageUploadURL,
                method: 'POST',
                json: rawJsonBody
            }

            request(options,function(error, body, response){
                console.log("ERROR ::" + error);
                console.log("RESPONSE  :: " + response);
            })
           
            .then(function(result){
                console.log(result);
            })
            .catch(
                function(err){
                console.log(err);
                }
            )
            */
        }
    }
    catch (err) {
        console.log("Streaming Error in GetRawImage!\n\nURL ::", streamingUrl);
    }
}

/**
 * to test if camera devices are online(able to stream) or not
 * @param {*[string]} rtspArray 
 * @param {*function} callback 
 */
var cameraUrls = function (rtspArray, callback) {
    console.log("CALL -cameraUrls");
    console.log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
    rtspArray.forEach(device => {
        try {
            const vCap = new cv.VideoCapture(device.streamingUrl);
            if (vCap != null) {
                device.camStatus = 1;
            }
        }
        catch (err) {
            console.log("Camera Device ::Not online ");
        }
    });
    //console.log("RESULT ARRAY::", rtspArray);
    callback(rtspArray);
}

/**
 * to start stream and send images to backend and respective compute engine
 * @param {*string} camId 
 * @param {*string} detectionType 
 * @param {*string} streamingUrl 
 * @param {*[string]} bboxes 
 * @param {*string} cameraFolder local folderpath to stream
 */
var startLiveStreaming = function (camId, detectionType, streamingUrl, bboxes, cameraFolder) {
    console.log("CALL -startLiveStreaming");
    console.log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~");

    //open the stream
    const vCap = new cv.VideoCapture(streamingUrl);
    //fps:frames per second, interval: call to function in interval
    var fps = vCap.get(5);      //vCap.get(CV_CAP_PROP_FPS)
    var interval = fps;
    //if Compute Engine=cloudComputeEngine
    if (detectionType === "faceDetection") {
        fps = fps * 3;
    }
    //filepath to stream images
    var filePath = cameraFolder + "/";
    if (vCap != null) {
        console.log("Stream Opened Successfully");
    }

    /** Rsync init :source(filePath):local folderpath ,destination: compute engine's folder path*/
    var rsync = new Rsync()
        .shell('ssh')
        .flags('avz')
        .source(filePath)
        .destination(config.jetsonFolderPath + camId);
    console.log("*Sending frames now!!\n``````````````````````````````````\n");

    /**
     * To stream continuous frames with interval
     */
    var camInterval = setInterval(function () {
        /**reading next frame */
        let frame = vCap.read();

        if (vCap.get(1) % parseInt(fps) == 0) {

            //console.log("WRITTEN IMAGE at time :: ", new Date());
            var timestamp = new Date().getTime();
            //composing imagename
            var imageName = camId + "_" + detectionType + "_" + timestamp + ".jpg";
            var imageFullPath = filePath + imageName;

            /**to write captured image of camera into local fs */
            cv.imwrite(imageFullPath, frame, [parseInt(cv.IMWRITE_JPEG_QUALITY), 50]);
            /**
             * Base 64 encoding
             */
            var base64Raw = base64_encode(imageFullPath);
            base64Raw = "data:image/jpg;base64, " + base64Raw;

            //Sending images to respective compute engine
            switch (detectionType) {
                case 'humanDetection':
                    /**
                     * to sync newly added file with compute engine's FS
                     */
                    rsync.execute(function (error, code, cmd) {
                        if (error) {
                            console.log("Error in rsync ::", error);
                        }
                        else {
                            console.log("Rsync done !");
                        }
                        //deleting the sent file 
                        fs.unlinkSync(imageFullPath);
                    });
                    break;

                case 'faceDetection':
                    /**
                     * to send images to cloud compute engine
                     */
                    var requestObj = request.post(config.cloudServiceUrl, function optionalCallback(err, httpResponse, body) {
                        if (err) {
                            return console.error('Failed to connect to compute engine:', err);
                        }
                        console.log('Upload successful!  Compute engine respond : ', body);
                    });
                    var form = requestObj.form();
                    form.append('areaOfInterest', JSON.stringify(bboxes));
                    form.append('targetUrl', config.cloudServiceTargetUrl);
                    form.append('timestamp', timestamp);
                    form.append('file',
                        fs.createReadStream(imageFullPath).on('end', function () {
                            console.log("***File sent to compute engine***");
                        })
                    );
                    break;
                default:
                    console.log("Warning : Default Case executed (feature specified not served)!");
            }

            /**
             * send newly added image to web backend
             */
            var imgJsonBody = {
                imgName: imageName,
                imgBase64: base64Raw
            };
            var options = {
                url: config.sendLiveStreamUploadURL,
                method: 'POST',
                json: imgJsonBody
            }
            request(options, function (error, body, response) {
                if (error) {
                    console.log("ERROR in posting image::" + error);
                }
                else
                    console.log("Response for image:: " + imgJsonBody.imgName + " => " + JSON.stringify(body.statusCode));
            })
        }
    }, 1000 / interval);

    /**To maintain live camera array */
    liveCamIntervalArray.push({
        camId: camId,
        intervalObj: camInterval
    });
}

/**
 * to receive bboxes and call startstreaming
 * @param {*string} message 
 * @param {*function} callback 
 */
var boundingBox = function (message, callback) {
    console.log("CALL -boundingBox");
    console.log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~");

    var parsedJson = parseJson(message);
    var streamingUrl = parsedJson.streamingUrl;
    var camId = parsedJson.camId;
    var cameraFolder = config.livestreamingCamFolder + camId;
    var detectionType = parsedJson.feature;

    //creating cameraId folder
    if (!fs.existsSync(cameraFolder)) {
        mkdirp(cameraFolder, function (err) {
            if (err) {
                console.log('Error in creating folder');
            } else {
                console.log("cameraId directory created successfully!");
                callback(camId, detectionType, streamingUrl, parsedJson.Coords, cameraFolder);
            }
        });
    } else
        callback(camId, detectionType, streamingUrl, parsedJson.Coords, cameraFolder);
};

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
            clearInterval(cam.intervalObj);
            //to remove stopped live camera 
            liveCamIntervalArray.splice(i, i + 1);
        }
    });
    callback(null);
};

//updation needed
app.get('/cameras/live', function (req, res) {
    var result = [];
    liveCamIntervalArray.forEach(function (cam) {
        result.push(cam.camId);
    });
    res.send(result);
});
