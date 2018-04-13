//Connect MQTT Broker
var config = require('../config');
var checkCamera = require('../controllers/checkCameraController').checkCamera;
var getRawImage = require('../controllers/rawImageController').getRawImage;
var liveStreamController = require('../controllers/liveStreamingController');
var apiController = require('../controllers/apiController');
var videoIndexing = require('../controllers/videoIndexing').videoStorage;

var mqtt = require('mqtt');
var parseJson = require('parse-json');
var client;
var clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString;
var Message = require('azure-iot-device').Message;

//Topic Names

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

var IOTHubListener = function(client)
{
    client.open(function (error) {
        if (error)
            console.log("Error in connecting..");
        else {
            client.on('message', function (message) {
                console.log('Id: ' + message.messageId + ' Body: ' + message.data);

                client.complete(message, printResultFor('completed'));

                var topic = message.messageId;
                var message = message.data;
                // message is Buffer
                console.log("DATA RECEIVED ON TOPIC :: ", topic);

                // logger.debug("Data received on topic : ",topic);
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
                        var parsedJson = parseJson(sendData);

                        getRawImage(message, function (error) {
                            if (!error) {
                                console.log("IOTHub==================getRawImage Topic Serving Done!!\n-----------------------------------\n");
                            }
                            else
                                console.log("**Error in GetRawImage :", error);
                        });
                        break;

                    /**
                     * Streaming 
                     */
                    case "startStreaming":
                        var sendData = message.toString();
                        var parsedJson = parseJson(sendData);
                        //console.log("Data to stream ::", parsedJson);

                        liveStreamController.createCameraFolder(sendData, function (parsedJson, cameraFolder) {
                            if (parsedJson.deviceType !== "Mobile") {
                                liveStreamController.startLiveStreaming(parsedJson, cameraFolder);
                                console.log("MQTT==================Start Streaming!!\n-----------------------------------\n");
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
                                console.log("MQTT==================Stopped the Streaming Cameras\n-----------------------------------\n");
                            }
                        });

                        break;
                    /**
                     * Stop/Start sending images to backend for a specific camera
                     */
                    case "toggleSendImageFlag":
                        var toggleObj = JSON.parse(message.toString());
                        console.log("Incoming : ", toggleObj.flag);
                        console.log("Incoming : ", toggleObj);
                        if (toggleObj.flag === 0 || toggleObj.flag === 1) {
                            liveStreamController.toggleSendImageFlag(toggleObj.camId, toggleObj.flag);
                        } else {
                            console.log("Error in ToggleSendImageFlag :: Invalid flag");
                        }
                        break;

                    /**
                     * video indexing
                     */
                    case "videoIndexingTopic":
                        var videoSourceData = message.toString();
                        var parsedJson = parseJson(videoSourceData);
                        videoIndexing(parsedJson);
                        console.log("Data sent for video indexing");
                        break;

                    default:
                        console.log("\n Default ::  Topic:: " + topic + " not handled!!");
                }
            });
        }
    });
}


//Subscriptions: number_of_topics:5
var topicSubscribe = function (deviceConnectionString) {
    console.log("In iot hub subcribe", deviceConnectionString);
    
    client = clientFromConnectionString(deviceConnectionString);
    IOTHubListener(client);
    client.on('errorreceived',printError);
}

module.exports.topicSubscribe = topicSubscribe;

