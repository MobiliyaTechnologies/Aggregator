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
const cv = require('opencv4nodejs');
var jsonSize=require('json-size');

var MQTTBroker = config.mqttBroker;
var MQTTBrokerJetson = config.mqttBrokerJetson;

var liveCamIntervalArray = [];

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
//app.use(bodyParser.json({limit: '50mb'}));
// app.use(bodyParser.json({limit:1024102420, type:'application/json'}));
// app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(cors());

//Connect MQTT Broker
var client = mqtt.connect('mqtt://52.177.169.81:1887');
// var clientJetson = mqtt.connect(MQTTBrokerJetson);

// clientJetson.on('connect', function () {
//     console.log("**ON PREMISE BROKER STATUS :: \n	MQTT broker connected!\n-----------------------------------\n");
// });

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
                    console.log("MESSAGE::",message.toString());
                    cameraUrls(JSON.parse(message.toString()), function (resultArray) {
                    console.log("Publishing Online Devices....")
                    client.publish("cameraStatus", JSON.stringify(resultArray));
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
                
                boundingBox(sendData, function (camId, detectionType, streamingUrl) {
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
    console.log("DEVICE ::", parsedJson);
    var streamingUrl = parsedJson.streamingUrl;
    try
    {
        const vCap = new cv.VideoCapture(streamingUrl);
        if(vCap!==null)
        {
            console.log("Camera can stream!");
            var deviceResult = { "camdetails":parsedJson,"flag": "1"};            
        }
    }  
        //console.log("  Device Test Results::", message);
    catch(err)  
    {
        console.log(err);
        var deviceResult = { "camdetails":parsedJson,"flag": "0"};            
    }
    var strdeviceResult = JSON.stringify(deviceResult);
    console.log("Result::", strdeviceResult);
    client.publish('addCameraResponse', strdeviceResult);
}

var base64_encode=function(file) {
    // read binary data
    var bitmap = fs.readFileSync(file);
    // convert binary data to base64 encoded string
    return new Buffer(bitmap).toString('base64');
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

    if (!fs.existsSync(config.camFolder)){
        mkdirp(config.camFolder, function (err) 
        {
            if (err) 
            {
                console.log(err);
            }else
                console.log("In GetRawImageDirectory created successfully!");
        });
    }
    try
    {
        const vCap = new cv.VideoCapture(streamingUrl);
        if(vCap!=null)
        {
            console.log("Opened");
            
            let raw = vCap.read(); 
            var rawImgName="./"+camId+".jpg";  
            cv.imwrite(rawImgName,raw,[parseInt(cv.IMWRITE_JPEG_QUALITY), 50]);
            var base64Raw = base64_encode(rawImgName); 
            console.log("BASE 64::\n");
            base64Raw="data:image/jpg;base64, "+base64Raw; //to remove and to implement on web side

            //Sync           
            var rawJsonBody = {
                imgName : rawImgName, 
                imgBase64 :  base64Raw
            };
            //MQTT APPROACH
            console.log("SIZE :: ",jsonSize(rawJsonBody));
            var rawJsonBodyString =JSON.stringify(rawJsonBody);
            //console.log(rawJsonBodyString);
            client.publish('rawMQTT',rawJsonBodyString);
            //HTTP
            /*
            console.log("BASE 64 Json");
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
    catch(err)  
    {
       console.log("    Streaming Error in GetRawImage !!");
    }
}

var cameraUrls = function (rtspArray, callback) {
    console.log("RTSP ARRAY ",rtspArray);
    rtspArray.forEach(device => {
        try
        {
            const vCap = new cv.VideoCapture(device.streamingUrl);
            if(vCap!=null)
            {
                device.camStatus=1;
            }
        }
        catch(err)
        {
            console.log("Not online !");
        }
    });
    console.log("RESULT ARRAY::",rtspArray);
    callback(rtspArray);
}

var startLiveStreaming= function(camId, detectionType,cameraFolder)
{
    const vCap = new cv.VideoCapture(streamingUrl); //'rtsp://komal:AgreeYa@114.143.6.99:554/cam/realmonitor?channel=14&subtype=0'  
    var frameRate = vCap.get(1);
    // vCap.set(1, 25);
    fps = vCap.get(5);
    var filePath = cameraFolder + "/" + camId + "_" + detectionType+ "_" ;
    if(vCap!=null) 
    {
        console.log("Stream Opened"); 
    } // loop through the capture
    //vCap.set(2,24);

    var camInterval = setInterval(function(){
    let frame = vCap.read();
    
    if (vCap.get(1) % fps == 0) {
        console.log("WRITTEN IMAGE ",new Date());
        cv.imwrite( filePath + new Date().getTime() + ".jpg", frame);
    }
    }, 1000/fps);

    liveCamIntervalArray.push({
    camId : req.body.camId,
    intervalObj : camInterval
    });
}

var boundingBox = function (message, callback) {
    var parsedJson = parseJson(message);
    var streamingUrl = parsedJson.url;
    var camId = parsedJson.camId;
    var cameraFolder = config.camFolder + '/Cam' + camId;
    var detectionTypeStr = parsedJson.feature;
    var detectionType = "";
    if (detectionTypeStr == 'humanDetection') {
        detectionType = "0";
    } else {
        detectionType = "1";
    }
    if (!fs.existsSync(cameraFolder)) {
        mkdirp(cameraFolder, function (err) {
            if (err) {
                console.log('Error in creating folder');
            } else{
                console.log("Directory created successfully!");
                callback(camId, detectionType, streamingUrl,cameraFolder);
            }
        });
    }else
        callback(camId, detectionType, streamingUrl,cameraFolder);
};
    
var stopCamera = function (message, callback) {
        var camIds= parseJson(message);
        let result = [];
        let tempArr = liveCamIntervalArray.slice();
        tempArr.forEach(function(cam, i){
          if(camIds.includes(cam.camId)){
            clearInterval(cam.intervalObj);
            //to remove stopped live cam 
            liveCamIntervalArray.splice(i,i+1);
            result.push({camId : cam.camId, camStatus : 'Stopped'});
          }
        });
        res.status(200).send(result);
};
    
var getLiveCameras=function(){
          var result=[];
      liveCamIntervalArray.forEach(function(cam){
        result.push(cam.camId);
      });
      //res.send(result);
};
    
    

var port = config.port;
app.listen(3003,function(){
    console.log('\n=========PROJECT HEIMDALL=========\n\n**SERVER STATUS :: \n	Project Heimdall Server is Available to Respond!!\n	Listening on port :: ', port);    
});
