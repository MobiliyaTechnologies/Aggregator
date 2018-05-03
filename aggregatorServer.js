var config = require('./config');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cors = require('cors');
const fs = require('fs');
var mkdirp = require('mkdirp');
const fileUpload = require('express-fileupload');

app.use(fileUpload());

//_________________SERVER CONFIGURATION_________________
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

var port = config.port;

console.log("\n----------------=========PROJECT HEIMDALL=========----------------\n");
console.log("\n		Name : ",config.aggregatorName);
console.log("		Backend : "+config.host+"\n");

/**
 * Registration of aggregator and starting API server
 */
require('./registration').register(function (result) {
    if (!result) {
        app.listen(port, function () {
            console.log('\n**API SERVER STATUS :: \n	Project Heimdall Server is Available to Respond!!\n	Listening on port :: ', port);
        });
    }
    else {
        console.log("\n**API SERVER STATUS :: \n    Not able to start Aggregator API Server ::", result);
    }
});

/**
 * aggregator api communication
 */
require('./routes/aggregatorRoutes')(app);

/**
* creating directories for images
*/
//Base directory Cameras
if (!fs.existsSync(config.camFolder)) {
    mkdirp(config.camFolder, function (err) {
        if (err) {
            console.log(err);
        } else
            console.log("Base camera directory created :", config.camFolder);
    });
}
//Raw Image directory
if (!fs.existsSync(config.rawImageDirectory)) {
    mkdirp(config.rawImageDirectory, function (err) {
        if (err) {
            return console.error(err);
        }
        console.log("Raw Image Directory created successfully! ");
    });
}

//Mobile camera Dwarp 
if (!fs.existsSync(config.imageTargetDirectory)) {
    mkdirp(config.imageTargetDirectory, function (err) {
        if (err) {
            return console.error(err);
        }
        console.log("360 Dwarped image directory created successfully! ");
    });
}

app.get('/', function (req, res) {
    console.log("/ Aggregator Responding...!!");
    res.send("Aggregator alive");
})

app.get('/_ping', function (req, res) {

    res.send("PONG");
});
