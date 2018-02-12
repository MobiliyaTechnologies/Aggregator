//ping mechanism
var serial = require('node-serial-key');
var request = require('request');
var config = require('./config');
var ip = require("ip");
var topicSubscribe = require('./mqtt/mqttCommunication').topicSubscribe;

var aggregatorId;

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

        request(options, function (error, response, body) {
            if (error) {
                console.log("Error Registering the Aggregator");
                callback(error);
            } else {
                console.log("\n	DeviceId : " + response.body._id);
                aggregatorId = response.body._id;
                
                //MQTT Connections
                topicSubscribe(aggregatorId);

                callback(null);
                console.log("Success in Registering Aggregator !");
            }
        });
    });

};

module.exports.register = register;