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
 * registering aggregator 
 * @param {*function} callback 
 */
var register = function (callback) {
    serial.getSerial(function (err, value) {
        //Aggregator information 
        var aggregatorData = {
            "name": config.aggregatorName,
            "url": config.url,
            "macId": value, "ipAddress": ip.address(),
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
        var maxTries = 4;

        var registerInterval = setInterval(function () {
            request(options, function (error, response, body) {
                if (error) {
                    console.log("\n**REGISTRATION STATUS :: \n    Error Registering the Aggregator");
                    callback(error);
                } else {
                    clearInterval(registerInterval);
                    console.log("\n	DeviceId : " + response.body._id);
                    aggregatorId = response.body._id;

                    // Create a new device
                    var device = {
                        deviceId: aggregatorId
                    };

                    registry.create(device, function (err, deviceInfo, res) {
                        if (err) {
                            console.log(' error: ' + err.toString());
                            registry.get(device.deviceId, function (err, deviceInfo, res) {
                                console.log("Device Already Registered with info :\n", deviceInfo);
                                var deviceConnectionString = "HostName=snsiothub.azure-devices.net;DeviceId=" + deviceInfo.deviceId + ";SharedAccessKey=" + deviceInfo.authentication.symmetricKey.primaryKey;
                                topicSubscribe(deviceConnectionString);
                                pingMechanismInterval(value);
                            });
                        }

                        if (res) console.log(' status: ' + res.statusCode + ' ' + res.statusMessage);
                        if (deviceInfo) {
                            console.log(' device info: ' + JSON.stringify(deviceInfo));
                            console.log("Formed Connection string to use in device :: " +
                                "HostName=snsiothub.azure-devices.net;DeviceId=" + deviceInfo.deviceId
                                + ";SharedAccessKey=" + deviceInfo.authentication.symmetricKey.primaryKey);
                            var deviceConnectionString = "HostName=snsiothub.azure-devices.net;DeviceId=" + deviceInfo.deviceId + ";SharedAccessKey=" + deviceInfo.authentication.symmetricKey.primaryKey;
                            //MQTT Topic subcription call
                            topicSubscribe(deviceConnectionString);
                            pingMechanismInterval(value);
                        }
                    });
                    callback(null);
                    console.log("\n**REGISTRATION STATUS :: \n    Success in Registering Aggregator !");
                }
                maxTries = maxTries - 1;
                if (maxTries === 0) {
                    console.log("\n\n**MaxTries Attended for registration!\n**Aggregator server not started...!\nPlease restart the server!");
                    clearInterval(registerInterval);
                }
            });
        }, 3000);
    });
};

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
