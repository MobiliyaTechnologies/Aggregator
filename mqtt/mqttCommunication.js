//Connect MQTT Broker
var config = require('../config');

var checkCamera = require('../controllers/checkCameraController').checkCamera;
var getRawImage = require('../controllers/rawImageController').getRawImage;
var configureCamera = require('../controllers/apiServer').configureCamera;

var mqtt = require('mqtt');
var parseJson = require('parse-json');

var MQTTBroker = config.mqttBroker;
var client = mqtt.connect(MQTTBroker);
client.on('connect', function () {
    console.log("MQTT BROKER CONNECTED !!");
});

//Topic Names
var checkCameraTopic, getRawImageTopic, cameraUrlsTopic, stopCameraTopic, startStreamingTopic;

//Subscriptions: number_of_topics:5
var topicSubscribe = function (aggregatorId) {
    console.log("Trying to connect with MQTT Broker");
    console.log("**BROKER -" + MQTTBroker + " STATUS ::");
    var connection = false;
    //console.log(client);

    console.log("\n	MQTT broker connected!\n-----------------------------------\n");
    client.subscribe('/');
    checkCameraTopic = 'checkCamera/' + aggregatorId;
    getRawImageTopic = 'getRawImage/' + aggregatorId;
    cameraUrlsTopic = 'cameraUrls';
    stopCameraTopic = 'stopCamera/' + aggregatorId;
    startStreamingTopic = 'startStreaming/' + aggregatorId;

    client.subscribe(checkCameraTopic);
    client.subscribe(getRawImageTopic);
    client.subscribe(cameraUrlsTopic);
    client.subscribe(stopCameraTopic);
    client.subscribe(startStreamingTopic);
    console.log("Done with subscription..!");

}

client.on('reconnect', function () {
    console.log("\n**BROKER STATUS :: \n  Trying to  reconnect MQTT broker!\n-----------------------------------\n");
});

client.on('close', function () {
    console.log("\n**BROKER STATUS :: \n     CLOSED connection with MQTT broker!\n-----------------------------------\n");
});
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
                        console.log("MQTT==================getRawImage Topic Serving Done!!\n-----------------------------------\n");
                    }
                    else
                        console.log("**Error in GetRawImage :", error);
                });

                break;
            }
        case cameraUrlsTopic:
            {
                //console.log("CAMERA TO TEST ::",JSON.parse(message.toString()));
                // cameraUrls(JSON.parse(message.toString()), function (resultArray) {
                //     console.log("Publishing Online Devices....", resultArray.length)
                //     client.publish("cameraStatus", JSON.stringify(resultArray));
                //     console.log("MQTT==================cameraUrls Done!!\n-----------------------------------\n");
                // });
                break;
            }

        case startStreamingTopic:
            {
                var sendData = message.toString();
                var parsedJson = parseJson(sendData);
                //console.log("BBOX ::", parsedJson);
                //STOP camera call

                createCameraFolder(sendData, function (parsedJson, cameraFolder) {
                    if (parsedJson.deviceType !== "Mobile") {
                        startLiveStreaming(parsedJson, cameraFolder);
                        console.log("MQTT==================Start Streaming!!\n-----------------------------------\n");
                    }
                    else {
                        configureCamera(parsedJson);

                        console.log("MQTT==================Adding Mobile camera Configurations Done!!\n-----------------------------------", configurationMobileCam);
                    }
                });

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

module.exports.mqttClient = client;
module.exports.topicSubscribe = topicSubscribe;