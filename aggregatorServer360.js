
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
var serial = require('node-serial-key');
var ip = require("ip");
const fileUpload = require('express-fileupload');

app.use(fileUpload());
var aggregatorId;
//_________________SERVER CONFIGURATION_________________
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

var port = config.port;
app.listen(port, function () {
    console.log('\n=========PROJECT HEIMDALL=========\n\n**SERVER STATUS :: \n	Project Heimdall Server is Available to Respond!!\n	Listening on port :: ', port);
});

//ping mechanism
serial.getSerial(function (err, value) {
    //Aggregator information 
    var aggregatorData = { "aggregatorName" : config.aggregatorName, 
                            "url": config.url, 
                            "macId" : value, "ipAddress": ip.address(),
                            "availability": config.availability, 
                            "location" : config.location,
                            "channelId" : config.channelId 
                        };
    var options = {
        url: config.registerAggregator,
        method: 'POST',
        json: aggregatorData
    };
    request(options, function (error, response, body) {
        if (error) {
            console.log("Error Registering the Aggregator");
        } else {
            console.log("\n	DeviceId : " + response.body._id); 
            //aggregatorId = response.body._id;
            aggregatorId = "";
            console.log("Success in Registering Aggregator !");
        }
    });
});

//to keep track of live cameras
var liveCamIntervalArray = [];

//Connect MQTT Broker
var MQTTBroker = config.mqttBroker;
var client = mqtt.connect(MQTTBroker);
aggregatorId ="";
var checkCameraTopic = 'checkCamera'+aggregatorId;
var getRawImageTopic = 'getRawImage'+aggregatorId;
var cameraUrlsTopic = 'cameraUrls'+aggregatorId;
var stopCameraTopic = 'stopCamera'+aggregatorId;
var startStreamingTopic = 'startStreaming'+aggregatorId;

//Subscriptions: number_of_topics:5
client.on('connect', function () {
    console.log("**BROKER STATUS :: \n	MQTT broker connected!\n-----------------------------------\n");
    client.subscribe('/');
    client.subscribe(checkCameraTopic);
    client.subscribe(getRawImageTopic);
    client.subscribe(cameraUrlsTopic);
    client.subscribe(stopCameraTopic);
    client.subscribe(startStreamingTopic);
});
/*
client.on('reconnect', function () {
    console.log("\n**BROKER STATUS :: \n  Trying to  reconnect MQTT broker!\n-----------------------------------\n");
});

client.on('close', function () { console.log("\n**BROKER STATUS :: \n     CLOSED connection with MQTT broker!\n-----------------------------------\n"); });
//_________________SERVER CONFIGURATION  DONE_________________
*/
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
        case checkCameraTopic:
            {
                var newDevice = message.toString();
                checkCamera(newDevice, function (error) {
                    console.log("MQTT==================checkCamera Done!!\n-----------------------------------\n");
                });
                break;
            }
        case getRawImageTopic:
            {
                var sendData = message.toString();
                var parsedJson = parseJson(sendData);
                var camId = parsedJson.camId;
                getRawImage(message, function (error) {
                    if (!error) {
                        console.log("MQTT==================getRawImage Done!!\n-----------------------------------\n");
                    }
                    else
                        console.log("**Error in GetRawImage :", error);
                });


                break;
            }
        case cameraUrlsTopic:
            {
		        //console.log("CAMERA TO TEST ::",JSON.parse(message.toString()));
                cameraUrls(JSON.parse(message.toString()), function (resultArray) {
                    console.log("Publishing Online Devices....",resultArray.length)
                    client.publish("cameraStatus", JSON.stringify(resultArray));
                    console.log("MQTT==================cameraUrls Done!!\n-----------------------------------\n");
                });
                break;
            }

        case startStreamingTopic:
            {
                var sendData = message.toString();
                var parsedJson = parseJson(sendData);
                //console.log("BBOX ::", parsedJson);
                //STOP camera call
                if (parsedJson.deviceName !== '360') {
                    boundingBox(sendData, function (camId, detectionType, streamingUrl, bboxes, cameraFolder) {
                        startLiveStreaming(camId, detectionType, streamingUrl, bboxes, cameraFolder);
                        console.log("MQTT==================boundingBox Done!!\n-----------------------------------\n");
                    });
                }
                break;
            }

        case stopCameraTopic:
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

if (!fs.existsSync(config.imageDirectory)) 
{
  mkdirp(config.imageDirectory, function(err)
  {
    if (err) 
    {
        return console.error(err);
    }  
    console.log("Directory created successfully! ");
    });
}

app.get('/',function(req,res){
    console.log("Hello");
    res.send("Aggregator alive");
})

app.post('/sendImage',function(req, res) {
    if (!req.files)
      return res.status(400).send('No files were uploaded.');
    let sampleFile = req.files.file;
    console.log("File received with name :: ",req.files.file.name);
    var imageName = req.files.file.name;
    // var imageType = JSON.parse(req.body.flag)

    // console.log("IMAGE TYPE ::",imageType);
    sampleFile.mv(config.imageDirectory +'/'+ imageName, function(err) 
    {
      if (err)
      {
        return res.status(500).send(err);
      }
      res.send({'result': 'File accepted !'});
      
      deWrapImage(imageName,function(error){
          console.log("Done with Rsync");
      });
    });

});

var deWrapImage = function(imageName,callback)
{
    var sourcePath = config.imageDirectory +'/'+imageName;
    var targetPath1 = config.imageTargetDirectory +'/1_'+imageName;
    var targetPath2 = config.imageTargetDirectory +'/2_'+imageName;
    var targetPath3 = config.imageTargetDirectory +'/3_'+imageName;
    var targetPath4 = config.imageTargetDirectory +'/4_'+imageName;

    // console.log('./fisheye -o 120 -c 521,518 -l 248,518 -r 420 420x420 '+sourcePath+' '+targetPath1);


var rsync = new Rsync()
.shell('ssh')
.flags('avz')
.source(config.imageTargetDirectory+'/')
.destination(config.jetsonFolderPath);


    // ls = exec('./fisheye -o 120 -c 521,518 -l 248,518 -r 420 420x420 '+sourcePath+' '+targetPath1);
    // ls = exec('./fisheye -o 120 -c 521,518 -l 521,248 -r 420 420x420 '+sourcePath+' '+targetPath2);
    // ls = exec('./fisheye -o 120 -c 521,518 -l 521,766 -r 420 420x420 '+sourcePath+' '+targetPath3);
    // ls = exec('./fisheye -o 120 -c 521,518 -l 766,500 -r 440 420x420 '+sourcePath+' '+targetPath4);

    // var rsyncInterval = setInterval(function(){
    //     if(count ===4){
    //         clearInterval(rsyncInterval);
    //         return;
    

    //     ls = exec(commands[count], function(err,stdout,stderr){
    //         if(err)
    //             console.log("Error :",err);
    //         if(stderr)
    //             console.log("stderr :",stderr);
    //         console.log("stdout :",stdout); 
    //         rsync.execute(function (error, code, cmd) {
    //             if (error)
    //                 console.log("Error in rsync ::", error);
    //             else{
    //                 console.log("Rsync done !");
    //                 var countTarget = count+1;
    //                 sendImages("1_"+imageName,targetPath+countTarget);
    //                 // fs.unlinkSync(targetPath1);
    //             }
    //         });
    //         // fs.unlinkSync(targetPath1);
    //     });
    //     count += 1;
    // },2000);



    // var commands=[],count=0;
    // commands.push('./fisheye -o 120 -c 521,518 -l 248,518 -r 420 420x420 '+sourcePath+' '+targetPath1);
    // commands.push('./fisheye -o 120 -c 521,518 -l 521,248 -r 420 420x420 '+sourcePath+' '+targetPath2);
    // commands.push('./fisheye -o 120 -c 521,518 -l 521,766 -r 420 420x420 '+sourcePath+' '+targetPath3);
    // commands.push('./fisheye -o 120 -c 521,518 -l 766,500 -r 440 420x420 '+sourcePath+' '+targetPath4);

    // var rsyncInterval = setInterval(function(){
    //     if(count ===4){
    //         clearInterval(rsyncInterval);
    //         return;
    //     }
    //     ls = exec(commands[count], function(err,stdout,stderr){
    //         if(err)
    //             console.log("Error :",err);
    //         if(stderr)
    //             console.log("stderr :",stderr);
    //         console.log("stdout :",stdout); 
    //         rsync.execute(function (error, code, cmd) {
    //             if (error)
    //                 console.log("Error in rsync ::", error);
    //             else{
    //                 console.log("Rsync done !");
    //                 var countTarget = count+1;
    //                 sendImages("1_"+imageName,targetPath+countTarget);
    //                 // fs.unlinkSync(targetPath1);
    //             }
    //         });
    //         // fs.unlinkSync(targetPath1);
    //     });
    //     count += 1;
    // },2000);

    // ls = exec('./fisheye -o 120 -c 521,518 -l 248,518 -r 420 420x420 '+sourcePath+' '+targetPath1 , function(err,stdout,stderr){
    //     if(err)
    //         console.log("Error :",err);
    //     if(stderr)
    //         console.log("stderr :",stderr);
    //     console.log("stdout :",stdout); 
    //     rsync.execute(function (error, code, cmd) {
    //         if (error)
    //             console.log("Error in rsync ::", error);
    //         else{
    //             console.log("Rsync done !");
    //             sendImages("1_"+imageName,targetPath1);
    //             // fs.unlinkSync(targetPath1);
    //         }
    //     });
    //     // fs.unlinkSync(targetPath1);
    // });
    ls = exec('./fisheye -o 120 -c 521,518 -l 521,248 -r 420 420x420 '+sourcePath+' '+targetPath2 , function(err,stdout,stderr){
        if(err)
            console.log("Error :",err);
        if(stderr)
            console.log("stderr :",stderr);
        console.log("stdout :",stdout); 
        rsync.execute(function (error, code, cmd) {
            if (error)
                console.log("Error in rsync ::", error);
            else{
                console.log("Rsync done !");
                sendImages("2_"+imageName,targetPath2);
                // fs.unlinkSync(targetPath2);
            }
        });
        // fs.unlinkSync(targetPath2);
    });
    // ls = exec('./fisheye -o 120 -c 521,518 -l 521,766 -r 420 420x420 '+sourcePath+' '+targetPath3 , function(err,stdout,stderr){
    //     if(err)
    //         console.log("Error :",err);
    //     if(stderr)
    //         console.log("stderr :",stderr);
    //     console.log("stdout :",stdout); 
    //     rsync.execute(function (error, code, cmd) {
    //         if (error)
    //             console.log("Error in rsync ::", error);
    //         else{
    //             console.log("Rsync done !");
    //             sendImages("3_"+imageName,targetPath3);
    //             // fs.unlinkSync(targetPath3);
    //         }
    //     });
    //     // fs.unlinkSync(targetPath3);
    // });
    // ls = exec('./fisheye -o 120 -c 521,518 -l 766,500 -r 440 420x420 '+sourcePath+' '+targetPath4 , function(err,stdout,stderr){
    //     if(err)
    //         console.log("Error :",err);
    //     if(stderr)
    //         console.log("stderr :",stderr);
    //     console.log("stdout :",stdout); 
    //     rsync.execute(function (error, code, cmd) {
    //         if (error)
    //             console.log("Error in rsync ::", error);
    //         else{
    //             console.log("Rsync done !");
    //             sendImages("4_"+imageName,targetPath4);
    //             // fs.unlinkSync(targetPath4);
    //         }
    //     });
    //     // fs.unlinkSync(targetPath4);
    // });
}

var sendImages = function(imgName, imgPath){

    console.log("Img name : "+ imgName + " Img Path :"+ imgPath);
    var base64Img = base64_encode(imgPath);
    base64Img = "data:image/jpg;base64, " + base64Img;
    console.log("IMG ::: ",base64Img);
    var imgJsonBody = {
        imgName: imgName,
        imgBase64: base64Img
    };

    var options = {
        url: config.sendLiveStreamUploadURL,
        method: 'POST',
        json: imgJsonBody
    }
    //console.log(options);
    request(options, function (error, body, response) {
        if (error) {
            console.log("ERROR in posting image::" + error);
        }
        else{
            fs.unlinkSync(imgPath);
            console.log("Response for image:: " + imgJsonBody.imgName + " => " + JSON.stringify(body.statusCode));
        }
    });
}

// deWrapImage('fisheye.jpg');
/**
* to test device if it can stream 
* @param {*string} message 
*/
var checkCamera = function (message, callback) {
    console.log("CALL -checkCamera");
    console.log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
    
    var parsedJson = parseJson(message);
    var streamingUrl = parsedJson.streamingUrl;
    var deviceType = parsedJson.deviceType;
    console.log("DEVICE URL to test::", streamingUrl);

    if (deviceType != 'Mobile'){
        try {
            const vCap = new cv.VideoCapture(streamingUrl);
            if (vCap !== null) {
                console.log("Camera device can stream!");
                var deviceResult = {
                    // "userId": parsedJson.userId, 
                    "camdetails": parsedJson, "flag": 1 };
                vCap.release();
            }
        }
        //console.log("  Device Test Results::", message);
        catch (err) {
            console.log(err);
            var deviceResult = {
                // "userId": parsedJson.userId, 
                "camdetails": parsedJson, "flag": 0 };
        }
    }
     
    else{
            var deviceResult = {
            // "userId": parsedJson.userId, 
            "camdetails": parsedJson, "flag": 1 };
        }
    var strdeviceResult = JSON.stringify(deviceResult);
    //console.log("Result::", strdeviceResult);
    client.publish('checkCameraResponse', strdeviceResult);
    callback(null);
   
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
var getRawImage = function (message, callback) {
    console.log("CALL -getRawImage");
    parsedJson = parseJson(message);
    console.log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~",parsedJson);

    var feature = parsedJson.feature;
    var camId = parsedJson.cameraId;
    var streamingUrl = parsedJson.streamingUrl;

    try {
        //open the stream
        const vCap = new cv.VideoCapture(streamingUrl);
        if (vCap != null) {
            console.log("*Opened the stream :", streamingUrl);

            vCap.readAsync((err, frame) => {
                var raw = frame;
                var rawImgName = "./" + camId + ".jpg";
                //write image to local FS
                cv.imwrite(rawImgName, raw, [parseInt(cv.IMWRITE_JPEG_QUALITY), 50]);
                //convert to base64
                var base64Raw = base64_encode(rawImgName);
                base64Raw = "data:image/jpg;base64, " + base64Raw;
                
                //Sync          
                var rawJsonBody = {
                    // userId: parsedJson.userId,
                    imgName: rawImgName,
                    imgBase64: base64Raw
                };
                //MQTT APPROACH
                var rawJsonBodyString = JSON.stringify(rawJsonBody);
                client.publish('rawMQTT', rawJsonBodyString);
                callback(null);
            });
            vCap.release();
            
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
        callback(err);
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
            //console.log("IN IT");
            const vCap = new cv.VideoCapture(device.streamingUrl);

            if (vCap != null) {
                device.camStatus = 1;
                vCap.release();
                // device.userId = parsedJson.userId
            }
            // vCap.release();
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
    var vCap;

    try{
      vCap   = new cv.VideoCapture(streamingUrl);
    }catch(error){
        console.log("Error opening stream : ",error);
    }
    //fps:frames per second, interval: call to function in interval
    var fps = 25; // vCap.get(5);      //vCap.get(CV_CAP_PROP_FPS)
    var interval = fps;
    //if Compute Engine=cloudComputeEngine
    if (detectionType === "faceDetection") {
        fps = fps * 3;
    }
    //filepath to stream images
    var filePath = cameraFolder + "/";
    if (vCap != null) {
        console.log("Stream Opened Successfully with fps ::", fps);
    }

    /** Rsync init :source(filePath):local folderpath ,destination: compute engine's folder path*/
    var rsync = new Rsync()
        .shell('ssh')
        .flags('avz')
        .source(filePath)
        .destination(config.jetsonFolderPath + camId);
    console.log("*Sending frames now!!\n``````````````````````````````````\n");
    var countframe = 0;
    /**
    * To stream continuous frames with interval
    */
    var camInterval = setInterval(function () {
        /**reading next frame */
        //let frame = vCap.read();
        vCap.readAsync((err, frame) => {
            if ( countframe%fps == 0) {
                
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
                            });
                        }
                        countframe= countframe+1;
        });

    }, 1000 / interval);

    /**To maintain live camera array */
    liveCamIntervalArray.push({
        camId: camId,
        intervalObj: camInterval,
        vCapObj : vCap
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
            cam.vCapObj.release();
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
