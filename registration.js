//ping mechanism
var serial = require('node-serial-key');
var request = require('request');
var config = require('./config');
var ip = require("ip");
var topicSubscribe = require('./mqtt/mqttCommunication').topicSubscribe;

//aggregatorId assigned by backend
var aggregatorId;

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
            "macId": "register", "ipAddress": ip.address(),
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
                    console.log("\n	DeviceId : " + response.body._id);
                    aggregatorId = response.body._id;

                    //MQTT Topic subcription call
                    topicSubscribe(aggregatorId);
                    pingMechanismInterval(value);
                    //to start api server
                    clearInterval(registerInterval);
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