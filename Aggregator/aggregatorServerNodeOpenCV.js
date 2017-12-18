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
var MQTTBroker = config.mqttBroker;
var MQTTBrokerJetson = config.mqttBrokerJetson;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
//app.use(bodyParser.json({limit: '50mb'}));
// app.use(bodyParser.json({limit:1024102420, type:'application/json'}));
// app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(cors());

//Connect MQTT Broker
var client = mqtt.connect('mqtt://52.177.169.81:1885');
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

var base64_encode=function(file) {
    // read binary data
    var bitmap = fs.readFileSync(file);
    // convert binary data to base64 encoded string
    return new Buffer(bitmap).toString('base64');
}

// var getRawImage = function (message) {
//     var pyshell = new PythonShell(config.getRawImage);
//     parsedJson = parseJson(message);

//     var feature = parsedJson.feature;
//     var camId = parsedJson.camId;

//     var streamingUrl = parsedJson.streamingUrl;
//     //Config change
//     console.log(parsedJson);
//     //camera_folder = config.camFolder /*+ 'Cam' + camId*/;

//     if (!fs.existsSync(config.camFolder)){
//         mkdirp(config.camFolder, function (err) 
//         {
//             if (err) 
//             {
//                 console.log(err);
//             }else
//                 console.log("In GetRawImageDirectory created successfully!");
//         });
//     }
//     try
//     {
//         const vCap = new cv.VideoCapture(streamingUrl);
//         if(vCap!=null)
//         {
//             console.log("Opened");
            
//             let raw = vCap.read(); 
//             var rawImgName="./"+camId+".jpg";  
//             cv.imwrite(rawImgName,raw);
//             var base64Raw = base64_encode(rawImgName); 
//             //Sync           
//             var rawJsonBody = {
//                 imgName : rawImgName, 
//                 imgBase64 :  base64Raw
//             };

//             var options = {
//                 url: config.getRawImageUploadURL,
//                 method: 'POST',
//                 json: rawJsonBody
//             }
//             request(options)
//             .then(function(result){
//                 console.log(result);
//             })
//             .catch(
//                 function(err){
//                 console.log(err);
//                 }
//             )
//         }
//     }  
//     catch(err)  
//     {
//        console.log("    Streaming Error in GetRawImage !!");
//     }
// }



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
            cv.imwrite(rawImgName,raw);
            var base64Raw = base64_encode(rawImgName); 
            console.log("BASE 64::\n");
            base64Raw="data:image/jpg;base64, "+base64Raw; //to remove and to implement on web side
            //Sync           
            var rawJsonBody = {
                imgName : rawImgName, 
                imgBase64 :  base64Raw
            };
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
            // .then(function(result){
            //     console.log(result);
            // })
            // .catch(
            //     function(err){
            //     console.log(err);
            //     }
            // )

        // var r = request.post(config.getRawImageUploadURL, function optionalCallback (err, httpResponse, body) {
        //             if (err) {
        //                 return console.error('upload failed:', err);
        //             }
        //             else
        //             {
        //                 console.log('Upload successful!  Server responded with:', body);
        //             }
        //         });
            
        //         var form = r.form();         
        //         console.log("Raw Image Name :: ",rawImgName);
        //         form.append('file', fs.createReadStream(rawImgName).on('end', function () {                
        //             console.log("");
        //         }));       
        }
    }  
    catch(err)  
    {
       console.log("    Streaming Error in GetRawImage !!");
    }
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

var port = config.port;
app.listen(3003);
console.log('\n=========PROJECT HEIMDALL=========\n\n**SERVER STATUS :: \n	Project Heimdall Server is Available to Respond!!\n	Listening on port :: ', port);
