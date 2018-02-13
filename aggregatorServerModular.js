var config = require('./config');
var mqqtClient = require('./mqtt/mqttCommunication');
var path = require('path');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cors = require('cors');
var parseJson = require('parse-json');
const fs = require('fs');
var exec = require('child_process').exec;
var mkdirp = require('mkdirp');
var request = require('request');
var jsonSize = require('json-size');
const fileUpload = require('express-fileupload');

app.use(fileUpload());

//_________________SERVER CONFIGURATION_________________
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

var port = config.port;

require('./registration').register(function (result) {
    if (!result) {
        app.listen(port, function () {
            console.log('\n=========PROJECT HEIMDALL=========\n\n**SERVER STATUS :: \n	Project Heimdall Server is Available to Respond!!\n	Listening on port :: ', port);
        });
    }
    else {
        console.log("Not able to start Aggregator API Server ::", result);
    }
});

/**
 * MOBILE AND 360 API CALL
 */
require('./routes/mobileRoutes')(app);
/**
* creating directories for images
*/
if (!fs.existsSync(config.camFolder)) {
    mkdirp(config.camFolder, function (err) {
        if (err) {
            console.log(err);
        } else
            console.log("Base camera directory created :", config.camFolder);
    });
}

if (!fs.existsSync(config.imageTargetDirectory)) {
    mkdirp(config.imageTargetDirectory, function (err) {
        if (err) {
            return console.error(err);
        }
        console.log("360 Dwarped image directory created successfully! ");
    });
}

if (!fs.existsSync(config.rawImageDirectory)) {
    mkdirp(config.rawImageDirectory, function (err) {
        if (err) {
            return console.error(err);
        }
        console.log("Raw Image Directory created successfully! ");
    });
}

app.get('/', function (req, res) {
    console.log("/ Aggregator RESPONDING ...!!");
    res.send("Aggregator alive");
})

app.get('/cameras/live', function (req, res) {
    var result = [];
    liveCamIntervalArray.forEach(function (cam) {
        result.push(cam.camId);
    });
    res.send(result);
});

app.get('/_ping', function (req, res) {

    res.send("PONG");
});
