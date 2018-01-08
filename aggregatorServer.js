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

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

var liveCamIntervalArray = [];

var MQTTBroker = config.mqttBroker;
//Connect MQTT Broker
var client = mqtt.connect(MQTTBroker);

//Subscriptions
client.on('connect', function () {
    console.log("**CLOUD BROKER STATUS :: \n	MQTT broker connected!\n-----------------------------------\n");
    client.subscribe('/');
    client.subscribe('addCamera');
    client.subscribe('getRawImage');
    client.subscribe('cameraUrls');
    //_____________JETSON COMMUNICATION_____________
    client.subscribe('stopCamera');
    client.subscribe('boundingBox');
    client.subscribe('stopAllCamera');
});

client.on('reconnect', function () {
    console.log("\n**BROKER STATUS :: \n  Trying to  reconnect MQTT broker!\n-----------------------------------\n");
});

client.on('close', function () { console.log("\n**BROKER STATUS :: \n     CLOSED connection with MQTT broker!\n-----------------------------------\n"); });

//Handling Messages
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
                //
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
                getRawImage(message);

                console.log("MQTT==================getRawImage Done!!\n-----------------------------------\n");
                break;
            }
        case 'cameraUrls':
            {
                // console.log("MESSAGE::", message.toString());
                cameraUrls(JSON.parse(message.toString()), function (resultArray) {
                    console.log("Publishing Online Devices....",resultArray)
                    client.publish("cameraStatus", JSON.stringify(resultArray));
                });
                break;
            }

        case 'boundingBox':
            {
                //console.log(message.toString());
                var sendData = message.toString();
                var parsedJson = parseJson(sendData);

                //STOP camera call
                boundingBox(sendData, function (camId, detectionType, streamingUrl, bboxes, cameraFolder) {
                    startLiveStreaming(camId, detectionType, streamingUrl, bboxes, cameraFolder);
                });

                console.log("MQTT==================startStream Done!!\n-----------------------------------\n");
                break;
            }

        case 'stopCamera':
            {
                //console.log("Payload for Stop camera :"+message.toString());
                var camIds = message.toString();
                console.log("\n*Stop cameras ::",camIds);
                stopCamera(camIds, function (error) {
                    if (!error) {
                        console.log("MQTT==================Stopped the camera\n-----------------------------------\n");
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

//Functions

var addCamera = function (message) {
    console.log("CALL -addCamera");

    var parsedJson = parseJson(message);
    var streamingUrl = parsedJson.streamingUrl;
    console.log("DEVICE URL to test::", streamingUrl);

    try 
    {
        const vCap = new cv.VideoCapture(streamingUrl);
        if (vCap !== null) 
        {
            console.log("Camera device can stream!");
            var deviceResult = { "camdetails": parsedJson, "flag": "1" };
        }
    }
    //console.log("  Device Test Results::", message);
    catch (err) {
        console.log(err);
        var deviceResult = { "camdetails": parsedJson, "flag": "0" };
    }
    var strdeviceResult = JSON.stringify(deviceResult);
    //console.log("Result::", strdeviceResult);
    client.publish('addCameraResponse', strdeviceResult);
}

var base64_encode = function (file) {
    // read binary data
    var bitmap = fs.readFileSync(file);
    // convert binary data to base64 encoded string
    return new Buffer(bitmap).toString('base64');
}

var getRawImage = function (message) {
    console.log("CALL -getRawImage");
    parsedJson = parseJson(message);

    var feature = parsedJson.feature;
    var camId = parsedJson.cameraId;
    var streamingUrl = parsedJson.streamingUrl;
  
    if (!fs.existsSync(config.camFolder)) {
        mkdirp(config.camFolder, function (err) {
            if (err) {
                console.log(err);
            } else
                console.log("In GetRawImageDirectory created successfully!");
        });
    }
    try {
        const vCap = new cv.VideoCapture(streamingUrl);
        if (vCap != null) {
            console.log("Opened");

            let raw = vCap.read();
            var rawImgName = "./" + camId + ".jpg";
            cv.imwrite(rawImgName, raw, [parseInt(cv.IMWRITE_JPEG_QUALITY), 50]);
            var base64Raw = base64_encode(rawImgName);
            //console.log("BASE 64::\n");
            base64Raw = "data:image/jpg;base64, " + base64Raw;

            //Sync          
            var rawJsonBody = {
                imgName: rawImgName,
                imgBase64: base64Raw
            };
            //MQTT APPROACH
            //console.log("SIZE :: ", jsonSize(rawJsonBody));
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
        console.log("    Streaming Error in GetRawImage !!");
    }
}

var cameraUrls = function (rtspArray, callback) {
    //console.log("RTSP ARRAY ", rtspArray);
    rtspArray.forEach(device => {
        try {
            const vCap = new cv.VideoCapture(device.streamingUrl);
            if (vCap != null) {
                device.camStatus = 1;
            }
        }
        catch (err) {
            console.log("Not online !");
        }
    });
    console.log("RESULT ARRAY::", rtspArray);
    callback(rtspArray);
}

var startLiveStreaming = function (camId, detectionType, streamingUrl, bboxes, cameraFolder) {
    console.log("STREAMING URL ::: "+streamingUrl);
    const vCap = new cv.VideoCapture(streamingUrl); //'rtsp://komal:AgreeYa@114.143.6.99:554/cam/realmonitor?channel=14&subtype=0'  
    var frameRate = vCap.get(1);
    var fps = vCap.get(5);
    var interval = fps;
    if(detectionType === "faceDetection"){
        fps = fps*3;
    }
    // fps = fps/3;
    console.log("FPS : "+fps);
    var filePath = cameraFolder + "/";
    console.log("FILEPATH ::",filePath);
    if (vCap != null) {
        console.log("Stream Opened Successfully");
    }

    /** Rsync init */
// var getLiveCameras =
    var rsync = new Rsync()
    .shell('ssh')
    .flags('avz')
    .source(filePath)
    .destination(config.jetsonFolderPath + camId);
   
    /**
     * To stream continuous frames with interval
     */
    var camInterval = setInterval(function () {
        /**reading next frame */
        let frame = vCap.read();

        if (vCap.get(1) % parseInt(fps) == 0) {

            console.log("WRITTEN IMAGE at time :: ", new Date());
            var timestamp  =  new Date().getTime();
            var imageName = camId + "_" + detectionType + "_" + timestamp + ".jpg";
            var imageFullPath = filePath + imageName;

            /**to write captured image of cam into local fs */
            cv.imwrite(imageFullPath, frame,[parseInt(cv.IMWRITE_JPEG_QUALITY), 50]);
            /**
             * Base 64 encoding
             */
            var base64Raw = base64_encode(imageFullPath);
            console.log("BASE 64::\n");
            base64Raw = "data:image/jpg;base64, " + base64Raw;

            /**
             * TODO : Plug to add multipl
// var getLiveCameras =e Detection api
             */
            // rsync.execute(function(error, code, cmd) {
            //     console.log("RSync Done");
            //     fs.unlinkSync(imageFullPath);
            // });
            console.log("Detection type : ",detectionType);
            switch(detectionType) {
                case 'humanDetection':
                    /**
                     * to sync newly added file with jetson fs
                     */
                    rsync.execute(function(error, code, cmd) {
                        console.log("RSynnc");
                        // var getLiveCameras =c Done");
                        fs.unlinkSync(imageFullPath);
                    });
                    break;
                case 'faceDetection':
                    var requestObj = request.post(config.cloudServiceUrl , function optionalCallback(err, httpResponse, body) {
                        if (err) {
                            return console.error('Failed to connect to compute engine:', err);
                        }

                        console.log('Upload successful!  Compute engine respond : ', body);
                    });
                    var form = requestObj.form();
                    form.append('areaOfInterest',JSON.stringify(bboxes));
                    form.append('targetUrl',config.cloudServiceTargetUrl);
                    form.append('timestamp',timestamp);
                    form.append('file',
                        fs.createReadStream(imageFullPath).on('end', function () {
                            console.log("--Image sent----");
                        })
                    );
                    break;
                default:
                    console.log("Warning : Default Case executed (feature specified not served)!");
            }
            
            /**
             * send newly added image to web backend
             */
            var rawJsonBody = {
                imgName: imageName,
                imgBase64: base64Raw
            };
            var rawJsonBodyString = JSON.stringify(rawJsonBody);
            var options = {
                url: config.sendLiveStreamUploadURL,
                method: 'POST',
                json: rawJsonBody,
                // headers: {
                //     'Content-Type': 'text/plain'
                // }
            }
            request(options,function(error, body, response){
                if(error){
                    console.log("ERROR in posting image::" + error);
                }else
                    console.log("Response from image post  :: " +JSON.stringify(body));
            })
            
        }
    }, 1000 / interval);

    /**To maintain live cam array */
    liveCamIntervalArray.push({
        camId: camId,
        intervalObj: camInterval
    });
}

var boundingBox = function (message, callback) {

    var parsedJson = parseJson(message);
    var streamingUrl = parsedJson.streamingUrl;
    var camId = parsedJson.camId;
    var cameraFolder = config.livestreamingCamFolder + camId;
    var detectionType = parsedJson.feature;
    
    console.log("Creating camID folder");
    if (!fs.existsSync(cameraFolder)) {
        mkdirp(cameraFolder, function (err) {
            if (err) {
                console.log('Error in creating folder');
            } else {
                console.log("Directory created successfully!");
                callback(camId, detectionType, streamingUrl, parsedJson.Coords, cameraFolder);
            }
        });
    } else
        callback(camId, detectionType, streamingUrl, parsedJson.Coords , cameraFolder);
};

var stopCamera = function (message, callback) {
    var camIds = parseJson(message);
    let tempArr = liveCamIntervalArray.slice();
    tempArr.forEach(function (cam, i) {
        if (camIds.includes(cam.camId)) {
            clearInterval(cam.intervalObj);
            //to remove stopped live cam 
            liveCamIntervalArray.splice(i, i + 1);
        }
    });
    callback(null);
};
 
app.get('/cameras/live',function (req,res) {
    var result = [];
    liveCamIntervalArray.forEach(function (cam) {
        result.push(cam.camId);
    });
    res.send(result);
});

var port = config.port;
app.listen(3003, function () {
    console.log('\n=========PROJECT HEIMDALL=========\n\n**SERVER STATUS :: \n	Project Heimdall Server is Available to Respond!!\n	Listening on port :: ', port);
});
