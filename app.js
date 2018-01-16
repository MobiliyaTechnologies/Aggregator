/*******************************************************************************
 * Copyright(c) 2017-2018 Mobiliya Technologies
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 *
 * @author: Gaurav Wable, Mobiliya
 * @version: 1.01
 * @summary: Create electron window and express server.
 *******************************************************************************/

'use strict';
var express = require('express');
var path = require('path');
var app = express();
var fs=require('fs');
var configFile = "config.js";
var bodyParser = require('body-parser');
var bus = require('./eventbus');
var cors = require('cors');

//var { app, BrowserWindow } = require('electron')
// OR
// Three Lines
var electron = require('electron');
var app1 = electron.app;
var BrowserWindow = electron.BrowserWindow;

var mainWindow = null;
app1.commandLine.appendSwitch("ignore-certificate-errors");

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({ width: 800, height: 650,
		show: true,
		webPreferences: {
	  	nodeIntegration: false,
			webSecurity: false
			}
		}
	);
	//mainWindow.openDevTools();
	mainWindow.loadURL('http://localhost:65157/index.html');
	// Emitted when the window is closed.
	mainWindow.on('closed', () => {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		

		mainWindow = null
			
		})
		mainWindow.webContents.session.clearCache(function(){
			//some callback.
			console.log("Electron Cache Clear");

			});
			mainWindow.webContents.session.clearStorageData(function(){
				//some callback.
				console.log("Electron Strorage Clear");
	
				});
		
}

app1.on('ready', createWindow);
app1.on('window-all-closed', app1.quit);

app1.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

// Run websocket server
require('./ws_server');

// Define the port to run on
app.set('port', 65157);
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json());
app.get('/version', function (req, res) {
    
	var config = require('./config');
	console.log( config.Version );
    res.end( config.Version );
})

app.get('/getConfiguration', function (req, res) {
    var config = require('./config');
    res.end(JSON.stringify(config));
});

app.post('/saveConfiguration', function (req, res) {
		console.log(req.body);
		if(req.body.MqttBokerUrl != 'undefined' && req.body.HostUrl != 'undefined') {	
			var config = require('./config');
			config.mqttBroker = req.body.mqttBroker;
			config.host = req.body.host;
			var fileContent = "var config = " + JSON.stringify(config) + ";\nmodule.exports = config;";
			fs.writeFileSync('./config.js', fileContent, 'utf-8');
			res.sendStatus(200);  
		} else {
			res.sendStatus(400);
		}
})

app.get('/getAzureServerUrl', function (req, res) {
	var config = require('./config');
	res.end(config.AzureServerUrl);
});

app.get('/startAggregator', function (req, res) {
	console.log("run AggregatorServer");
	var config = require('./aggregatorServer');
	res.sendStatus(200);
});

app.post('/saveAzureServerUrl', function (req, res) {
	var url = req.body.AzureServerUrl;
	if(url != 'undefined') {	
		//console.log(url);
		var config = require('./config');
		config.AzureServerUrl = url;
		var fileContent = "var config = " + JSON.stringify(config) + ";\nmodule.exports = config;";
		fs.writeFileSync('./config.js', fileContent, 'utf-8');
		res.sendStatus(200);  
	} else {
		res.sendStatus(400);
	}
})

function deleteFiles(files, callback){
  var i = files.length;
  files.forEach(function(filepath){
	  
	console.log("deleting "+ filepath);
    fs.unlink(filepath, function(err) {
      i--;
      if (err) {
        callback(err);
        return;
      } else if (i <= 0) {
        callback(null);
      }
    });
  });
}

app.get('/resetgateway', function (req, res) {
	console.log("resetgateway api call");
	
	bus.emit('stopGateway');
	/*
	var files = ['./connectionString.txt', './capabilities.json', './sensorlist.json','./sensorTypes.json', './connectionTimeout.txt'];
	
	deleteFiles(files, function(err) {
		if (err) {
			console.log(err);
			client.trackException(err);
		} else {
			console.log('all files removed');
		}
	});
	*/
	bus.emit('log', '\n--------------------------\nGateway has been reset.\nPlease Restart Gateway !!!\n--------------------------\n');
	res.sendStatus(200);
})

var server = app.listen(app.get('port'), function() {
  var port = server.address().port;
  console.log('Login page running on port ' + port);
});