//Connect MQTT Broker
var config = require('../config');
var checkCamera = require('../controllers/checkCameraController').checkCamera;
var rawImageController = require('../controllers/rawImageController');
var liveStreamController = require('../controllers/liveStreamingController');
var videoIndexing = require('../controllers/videoIndexing').videoStorage;
var mobileCameraFlow = require('../controllers/mobileCameraFlow');
var mobileCameraVideo = require('../controllers/mobileCameraVideo');

var mqtt = require('mqtt');
var clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString;

var client;

function printResultFor(op) {
    return function printResult(err, res) {
        if (err) console.log(op + ' error: ' + err.toString());
        if (res) console.log(op + ' status: ' + res.constructor.name);
    };
}

var printError = function (err) {
    console.error("\n\n\n\n********************************************************************************Iot Hub Connection Error ::", err.message || err);
    cb(err, null, null);
};

/**
 * Receive and process messages (6 events)
 * @param {*} client 
 */
var IOTHubListener = function (client) {
    client.open(function (error) {
        if (error)
            console.log("Error in connecting..");
        else {
            console.log("Connected to IOTHub");
            client.on('message', function (message) {
                console.log('Id: ' + message.messageId + ' Body: ' + message.data);
                client.complete(message, printResultFor('completed'));

                var topic = message.messageId;
                var message = message.data;
                // message is Buffer
                console.log("DATA RECEIVED ON TOPIC :: ", topic);

                switch (topic) {
                    case '/':
                        {
                            console.log("IOTHub==================Project Heimdall Aggregator Server Available to Respond!!\n-----------------------------------\n");
                            break;
                        }
                    /**
                     * Camera Adding
                     */
                    case "checkCamera":
                        var newDevice = message.toString();
                        checkCamera(newDevice, function (error) {
                            console.log("IOTHub==================checkCamera Done!!\n-----------------------------------\n");
                        });
                        break;
                    /**
                     * Raw Image
                     */
                    case "getRawImage":
                        var sendData = message.toString();
                        var parsedJson = JSON.parse(sendData);

                        rawImageController.getRawImage(message, function (error) {
                            if (!error) {
                                console.log("IOTHub==================getRawImage Topic Serving Done!!\n-----------------------------------\n");
                            }
                            else
                                console.log("**Error in GetRawImage :", error);
                        });
                        break;
                    /**
                     * Mobile Camera raw Image
                     */
                    case "mobileCameraRawImage":
                        var sendData = message.toString();
                        var parsedJson = JSON.parse(sendData);
                        rawImageController.mobileCameraRawImage(parsedJson, function () {
                            console.log("Mobile Camera Raw Image Saved..");
                        });
                        break;

                    /**
                     * Camera Streaming 
                     */
                    case "startStreaming":
                        var sendData = message.toString();
                        var parsedJson = JSON.parse(sendData);
                        //console.log("Data to stream ::", parsedJson);

                        liveStreamController.createCameraFolder(sendData, function (parsedJson, cameraFolder) {
                            if (parsedJson.deviceType !== "Mobile") {
                                liveStreamController.startLiveStreaming(parsedJson, cameraFolder);
                                console.log("MQTT==================Start Streaming!!\n-----------------------------------\n");
                            }else{
                                mobileCameraVideo.streamMobileVideo(parsedJson,cameraFolder);
                            }
                        });
                        break;

                    /**
                     * Stop streaming
                     */
                    case "stopCamera":
                        var camIds = message.toString();
                        console.log("\n*Stop these cameras ::", JSON.stringify(camIds));
                        liveStreamController.stopCamera(camIds, function (error) {
                            if (!error) {
                                console.log("MQTT==================Stop Camera Done\n-----------------------------------\n");
                            }
                        });

                        break;

                    /**
                     * Stop/Start sending images to backend for a specific camera
                     */
                    case "toggleSendImageFlag":
                        var toggleObj = JSON.parse(message.toString());
                        console.log("Incoming : ", toggleObj);
                        if (toggleObj.flag === 0 || toggleObj.flag === 1) {
                            liveStreamController.toggleSendImageFlag(toggleObj.camId, toggleObj.flag);
                        } else {
                            console.log("Error in ToggleSendImageFlag :: Invalid flag");
                        }
                        break;

                    /**
                     * video indexing(Record video) and upload to video Indexer
                     */
                    case "videoIndexing":
                        var videoSourceData = message.toString();
                        var parsedJson = JSON.parse(videoSourceData);
                        parsedJson.record = false;
                        videoIndexing(parsedJson);
                        console.log("Data sent for video recording");
                        break;

                    /**
                     * video indexing(Record video) and upload to video Indexer
                     */
                    case "uploadVideo":
                        var videoSourceData = message.toString();
                        var parsedJson = JSON.parse(videoSourceData);
                        parsedJson.record = true;
                        videoIndexing(parsedJson);
                        console.log("Data sent for video recording");
                        break;

                    /**
                     * Mobile camera blob images streaming
                     */
                    case "mobileCameraLiveImages":
                        var imageData = message.toString();
                        liveStreamController.createCameraFolder(imageData, function (parsedJson, cameraFolder) {
                            mobileCameraFlow.sendMobileCameraImages(parsedJson, cameraFolder);
                        });
                        break;

                    default:
                        console.log("\n Default ::  Topic:: " + topic + " not handled!!");
                }
            });
        }
    });
}

/**
 * Connect to IOTHub
 * @param {*} deviceConnectionString 
 */
var topicSubscribe = function (deviceConnectionString) {
    console.log("Let's connect to IOTHub");

    client = clientFromConnectionString(deviceConnectionString);
    IOTHubListener(client);
    client.on('errorReceived', printError);
    client.on('error', function (err) {
        console.error(err.message);
    });
    client.on('disconnect', function () {
        console.log("Disconnected");
        //client.open(connectCallback);
    });
}

module.exports.topicSubscribe = topicSubscribe;

