//ping mechanism
var serial = require('node-serial-key');
var request = require('request');
var ip = require("ip");

var config = require('./config');
var topicSubscribe = require('./mqtt/mqttCommunication').topicSubscribe;

//aggregatorId assigned by backend
var aggregatorId;
var iothub = require('azure-iothub');
var connectionString = config.iotHub.connectionString;
var registry = iothub.Registry.fromConnectionString(connectionString);

/**
 * registering aggregator to backend, connecting to IOTHub
 * @param {*function} callback 
 */
var register = function (callback) {
    serial.getSerial(function (err, value) {
        var appendIPtoName = ip.address().split(".")[3];
        //Aggregator information 
        var aggregatorData = {
            "name": config.aggregatorName + "_" + appendIPtoName,
            "url": config.url,
            "macId":"test"+ value, "ipAddress": ip.address(),
            "availability": config.availability,
            "location": config.location,
            "channelId": config.channelId
        };
        var options = {
            rejectUnauthorized: false,
            url: config.registerAggregator,
            method: 'POST',
            json: aggregatorData
        };
        request(options, function (error, response, body) {
            if (error) {
                console.log("\n**REGISTRATION STATUS :: \n    Error Registering the Aggregator");
                callback(error);
            } else {
                console.log("\n**REGISTRATION STATUS :: \n    Success in Registering Aggregator !");

                console.log("\n	DeviceId : " + response.body._id);
                aggregatorId = response.body._id;

                //____________________IOTHub registration____________________
                // Create a new device
                var device = {
                    deviceId: aggregatorId
                };
                registry.create(device, function (err, deviceInfo, res) {
                    if (err) {
                        console.log(' error: ' + err.toString());
                        //if device already registered
                        registry.get(device.deviceId, function (err, deviceInfo, res) {
                            console.log("Got the device info\n");
                            var deviceConnectionString = "HostName=snsiothub.azure-devices.net;DeviceId=" + deviceInfo.deviceId + ";SharedAccessKey=" + deviceInfo.authentication.symmetricKey.primaryKey;
                            topicSubscribe(deviceConnectionString);
                            pingMechanismInterval(value);
                        });
                    }

                    if (res)
                        console.log(' status: ' + res.statusCode + ' ' + res.statusMessage);
                    if (deviceInfo) {
                        //console.log(' device info: ' + JSON.stringify(deviceInfo));
                        var deviceConnectionString = "HostName=snsiothub.azure-devices.net;DeviceId=" + deviceInfo.deviceId + ";SharedAccessKey=" + deviceInfo.authentication.symmetricKey.primaryKey;
                        topicSubscribe(deviceConnectionString);
                        pingMechanismInterval(value);
                    }
                });
                callback(null);
            }
        });
    });
};

/**
 * Ping mechanism
 * @param {*} serialNo 
 */
var pingMechanismInterval = function (serialNo) {
    setInterval(function () {
        var aggregatorData = {
            "name": config.aggregatorName,
            "url": config.url,
            "macId": serialNo, "ipAddress": ip.address()
        };
        var options = {
            rejectUnauthorized: false,
            url: config.registerAggregator,
            method: 'POST',
            json: aggregatorData
        };
        request(options, function (error, response, body) {
            if (error) {
                console.log("\n**PING STATUS :: \n    Error in Ping interval of the Aggregator : ", error);
            } else {
                console.log("\n**PING STATUS :: \n    Success in Aggregator Ping !");
            }
        });
    }, config.pingInterval);
}

module.exports.register = register;
