var config = require('./config');
var path = require('path');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cors = require('cors');
var parseJson = require('parse-json');
const fs = require('fs');
var PythonShell = require('python-shell');
var exec = require('child_process').exec;
var Type = require('type-of-is');
var mkdirp = require('mkdirp');
var mqtt = require('mqtt');
var request = require('request');

var MQTTBroker = config.mqttBroker;
var MQTTBrokerJetson = config.mqttBrokerJetson;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

//Connect MQTT Broker
var client = mqtt.connect(MQTTBroker);
var clientJetson = mqtt.connect(MQTTBrokerJetson);

clientJetson.on('connect', function () {
    console.log("**ON PREMISE BROKER STATUS :: \n	MQTT broker connected!\n-----------------------------------\n");
});

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

    //stop any old process
    //stopAllCamera();
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
                //console.log(message.toString());
                console.log("MQTT==================Project Heimdall Aggregator Server Available to Respond!!\n-----------------------------------\n");
                break;
            }
        case 'addCamera':
            {
                //console.log(message.toString());
                var newDevice = message.toString();
                addCamera(newDevice);
                console.log("MQTT==================addCamera Done!!\n-----------------------------------\n");
                break;
            }
        case 'getRawImage':
            {
                //console.log(message.toString());
                var sendData = message.toString();
                var parsedJson = parseJson(sendData);
                var camId = parsedJson.camId;
                stopCamera(camId, function () {
                    getRawImage(message);
                });

                console.log("MQTT==================getRawImage Done!!\n-----------------------------------\n");
                break;
            }
        case 'cameraUrls':
            {
                cameraUrls(JSON.parse(message.toString()), function (resultArray) {
                    console.log("Publishing Online Devices....")
                    client.publish("cameraStatus", resultArray);
                });
                break;
            }
        //_____________JETSON COMMUNICATION_____________
        case 'boundingBox':
            {
                //console.log(message.toString());
                var sendData = message.toString();
                var parsedJson = parseJson(sendData);
               
                clientJetson.publish('boundingBoxOnPremise', message);
                
                startStream(sendData, function (camId, detectionType, streamingUrl) {
                    startLiveStreaming(camId, detectionType, streamingUrl)
                });

                console.log("MQTT==================startStream Done!!\n-----------------------------------\n");
                break;
            }

        case 'stopCamera':
            {
                //console.log(message.toString());
                var parsedJson = parseJson(message.toString());
                console.log(parsedJson);
                var camId = parsedJson.camId;
                //console.log("Message::", parsedJson);
                stopCamera(camId, function () { });
                var camId = parsedJson.camId;
                var options = {
                    url: config.stopCameraURL,
                    method: 'POST',
                    json: parsedJson
                }
                request(options, function(err,response,body) { console.log("Done!!"); });
                clientJetson.publish('stopCamera', message);
                console.log("MQTT==================stopCamera Done!!\n-----------------------------------\n");
                break;
            }
        case 'stopAllCamera':
            {
                stopAllCamera();
                var parsedJson = { 'xyz': 'cy' }
                var options = {
                    url: config.stopAllCameraURL,
                    method: 'POST',
                    json: parsedJson
                }
                request(options, function() { console.log("Done!!"); });
                clientJetson.publish('stopAllCamera', message);
                console.log("MQTT==================stopAllCamera Done!!\n-----------------------------------\n");
                break;
            }
        default:
            {
                console.log("\n DEfault ::  Topic:: " + topic + " not handled!!");
            }
    }
});

//Functions
var addCamera = function (message) {
    console.log("CALL -addCamera", message);
    var parsedJson = parseJson(message);

    var pyshelltest = new PythonShell(config.testDevice);
    var deviceArray = [];
    deviceArray.push(parsedJson.streamingUrl);
    var deviceToTest = JSON.stringify(deviceArray);
    pyshelltest.send(deviceToTest);
    console.log("Streaming device to test ::" + deviceArray);

    pyshelltest.on('message', function (message) {
        console.log(message);
        //console.log("  Device Test Results::", message);
        var deviceResult = { "flag": message.toString().replace(/\r?\n|\r/g, "") };
        var strdeviceResult = JSON.stringify(deviceResult);
        //console.log("Data::", strdeviceResult);
        client.publish('addCameraResponse', strdeviceResult);
    });

    pyshelltest.end(function (err) {
        if (err) {
            console.log("   Python result:: Python Error in adding camera in testDevice.py file!!")
        }
        else {
            console.log("   Python result:: Device Testing Done");
        }
    });
}

var startLiveStreaming = function (camId, detectionType, streamingUrl) {

    var pyshell = new PythonShell(config.livestreaming);
    
    var array = [];
    array.push(detectionType, camId, streamingUrl, config.stopProcessing, config.livestreamingCamFolder,config.jetsonFolderPath,config.getImage);
    var dataStreaming = JSON.stringify(array);

    console.log("  Data to livestream::", dataStreaming);
    console.log("  Starting live streaming now!!");
    pyshell.send(dataStreaming);

    pyshell.on('message', function (message) {
        console.log(message);
    });

    pyshell.end(function (err) {
        if (err) {
            console.log("   Python result:: Python Error in starting livestream (livestreaming.py file)!!", err);
        }
        else {
            console.log("   Python result:: Livestreaming Done");
        }
    });
}

var startStream = function (message, callback) {
    console.log("API CALL -startStream");
    var parsedJson = parseJson(message);
    console.log("\n  New bounding boxes::", parsedJson);
    var camId = parsedJson.camId;
    var detectionTypeStr = parsedJson.feature;
    var detectionType = "";
    if (detectionTypeStr == 'humanDetection') {
        detectionType = "0";
    } else {
        detectionType = "1";
    }
    //startStream(sendData);
    //stopCamera(camId,function(){
    var streamingUrl = parsedJson.streamingUrl;

    console.log("\n  CamId:::", camId);

    var cameraFolder = config.camFolder + '/Cam' + camId;
    // if (fs.existsSync(cameraFolder)) 
    // {
    //     exec('rm -r ' + cameraFolder, function (err, stdout, stderr) {
    //         console.log("\n Folder deleted !!");
    //     });  
    // }  
    
    if (!fs.existsSync(cameraFolder)) {
        mkdirp(cameraFolder, function (err) {
            if (err) {
                console.log('Error in creating folder');
            } else{
                console.log("Directory created successfully!");
                callback(camId, detectionType, streamingUrl);
            }
        });
    }else
        callback(camId, detectionType, streamingUrl);
    
    //,function(){console.log("BACK from STREAMING!!");}
}

var getRawImage = function (message) {
    var pyshell = new PythonShell(config.getRawImage);
    parsedJson = parseJson(message);

    var feature = parsedJson.feature;
    var camId = parsedJson.camId;

    var streamingUrl = parsedJson.streamingUrl;
    //Config change
    console.log(parsedJson);
    //camera_folder = config.camFolder /*+ 'Cam' + camId*/;

    if (!fs.existsSync(config.camFolder)) {
        mkdirp(config.camFolder, function (err) {
            if (err) {
                console.log(err);
            }else
                console.log("In GetRawImageDirectory created successfully!");
        });
    }

    /*if (!fs.existsSync(camera_folder)) 
    {
    mkdirp(camera_folder, function(err) {
        if (err) 
        {
            console.log(err);
        }
        console.log("In GetRawImageDirectory created successfully!");
    });
    }*/

    var array = [];
    if (feature == 'humanDetection') {
        array.push("0");
    } else {
        array.push("1");
    }
    array.push(camId, streamingUrl, config.getRawImageUploadURL);
    console.log("DATA for Raw Image ::", array);
    var deviceData = JSON.stringify(array);
    pyshell.send(deviceData);
    console.log("After sending to PY");
    pyshell.on('message', function (message) {
        console.log(message);
    });

    pyshell.end(function (err) {
        if (err) {
            console.log("   Python result:: Python Error in getRawImage (getRawImage.py file)!!"+ err);
        }
        else
            console.log("   Python result:: GetRawImage Done");
    });
}

var stopCamera = function (camId, callback) {
    console.log('  Stopping Camera:: ' + camId);
    var pyshell = new PythonShell(config.stopCamera);

    var array = [];
    array.push(camId);

    cam_arr = JSON.stringify(array);
    console.log("Camera::" + cam_arr);

    pyshell.send(cam_arr);
    pyshell.on('message', function (message) {
        console.log(message);
    });

    pyshell.end(function (err) {
        if (err) {
            console.log("Error in stopping camera");
        }
        else {
            console.log('  STOPPED the Camera:: ' + camId);
        };
        callback();
    });
}

var stopAllCamera = function () {
    var python = require('child_process').spawn('python', [config.stopAllCamera]);
    var output = "";
    python.stdout.on('data', function (data) { output += data });
    python.on('close', function (code) {
        console.log("  STOPPED all cameras(Livestreaming and Processing)..!!");
    });
    if (fs.existsSync(config.stopProcessing)) {
        fs.unlinkSync(config.stopProcessing);
    }
}

var cameraUrls = function (rtspArray, callback) {
    var statusArray = [];
    var pyshell = new PythonShell(config.getCameraStatus);

    pyshell.send(JSON.stringify(rtspArray));
    pyshell.on('message', function (message) {
        console.log("CAMERA STATUS of:::::",JSON.stringify(message));
        statusArray = JSON.stringify(message);
    });

    pyshell.end(
        function (err) {
            if (err) {
                console.log("   Couldnt publish online devices!!"+err);

            } else {
                console.log("   Done publishing online devices");
                callback(statusArray);

            }

        });
}

var port = config.port;
app.listen(port);
console.log('\n=========PROJECT HEIMDALL=========\n\n**SERVER STATUS :: \n	Project Heimdall Server is Available to Respond!!\n	Listening on port :: ', port);
