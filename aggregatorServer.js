var path = require('path');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cors = require('cors');
var parseJson = require('parse-json');
const fs = require('fs');
var PythonShell = require('python-shell');
var exec = require('child_process').exec;
var Type = require('type-of-is');
var mkdirp = require('mkdirp');
var mqtt = require('mqtt');
var request = require('request');

var stopProcessing = '/home/ubuntu/surveillance/jetson-dl/jetson-device-client/NodeRest/stopProcessing';
var stopProcessingDetectnet = '/home/ubuntu/surveillance/jetson-dl/jetson-device-client/NodeRest/stopProcessingDetectnet';
var watcherFile="/home/ubuntu/surveillance/jetson-dl/jetson-inference/build/aarch64/json_watcher.py";

var MQTTBroker='mqtt://52.177.169.81:1885'

app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true })); 
app.use(cors());

//Start JSON Watcher
/*
var watcher = require('child_process').spawn('python',
     [watcherFile
     ]
     );
     var output = "";
     watcher.stdout.on('data', function(data){ output += data; console.log(output)});
     watcher.on('close', function(code)
     { 
		console.log("  STOPPED WATCHER..!!");
     });

*/
//Connect MQTT Broker
var client  = mqtt.connect(MQTTBroker);

//Subscriptions
client.on('connect', function () {
  console.log("**BROKER STATUS :: \n	MQTT broker connected!\n-----------------------------------\n");
  client.subscribe('/');
  client.subscribe('addCamera');
  client.subscribe('updateDeviceList');
  client.subscribe('boundingBox');
  client.subscribe('getRawImage');
  client.subscribe('stopCamera');
  client.subscribe('stopAllCamera');  
  //stop any old process
  stopAllCamera();
});

client.on('reconnect', function () {
  console.log("\n**BROKER STATUS :: \n  Trying to  reconnect MQTT broker!\n-----------------------------------\n");
});

client.on('close',function(){  console.log("\n**BROKER STATUS :: \n     CLOSED connection with MQTT broker!\n-----------------------------------\n");});
 
//Handling Messages
client.on('message', function (topic, message) {
  // message is Buffer
  console.log(topic);
  switch(topic)
  {
  	case '/':
  		{
  			//console.log(message.toString());
  			console.log("MQTT==================Project Heimdall Server Available to Respond!!\n-----------------------------------\n");
  			break;
  		}
  	case 'addCamera':
  		{
  			//console.log(message.toString());
  			var newDevice=message.toString();
  			addCamera(newDevice);
  			console.log("MQTT==================addCamera Done!!\n-----------------------------------\n");
  			break;
  		}
  	case 'updateDeviceList':
  		{
  			//console.log(message.toString());
  			var testedDevice=message.toString();
  			updateDeviceList(testedDevice);
  			console.log("MQTT==================updateDeviceList Done!!\n-----------------------------------\n");
  			break;
  		}
	case 'boundingBox':
	{
			//console.log(message.toString());
			var sendData=message.toString();
			var parsedJson = parseJson(sendData);
			var camId = parsedJson.camId;
			//boundingBox(sendData);
			//stopCamera(camId,function(){
			boundingBox(sendData);
			//});
			
			console.log("MQTT==================boundingBox Done!!\n-----------------------------------\n");
			break;
	}
	case 'getRawImage':
	{
			//console.log(message.toString());
			var sendData=message.toString();
			var parsedJson = parseJson(sendData);
			var camId = parsedJson.camId;
			stopCamera(camId,function(){
				getRawImage(message);
			});

			console.log("MQTT==================getRawImage Done!!\n-----------------------------------\n");
			break;
	}
	case 'stopCamera':
	{
			//console.log(message.toString());
			var parsedJson = parseJson(message.toString());
			var camId = parsedJson.camId;
			var options ={ 
					url: 'http://52.177.169.81:5005/api/resetCameraStatus',            
					method: 'POST',
					json: parsedJson        
				}    
			request(options, function () { console.log("Done!!"); })

			console.log("Message::",parsedJson);
			stopCamera(camId,function(){
			});
			console.log("MQTT==================stopCamera Done!!\n-----------------------------------\n");
			break;
	}
	case 'stopAllCamera':
	{
			stopAllCamera();
			var parsedJson={'xyz':'cy'}
			var options ={ 
					url: 'http://52.177.169.81:5005/api/resetAllCameraStatus',            
					method: 'POST',
					json: parsedJson        
				}    
			request(options, function () { console.log("Done!!"); });
			console.log("MQTT==================stopAllCamera Done!!\n-----------------------------------\n");
			break;
	}
	default:
	{
			console.log("\n Topic:: "+topic+" not handled!!");
	}	
  }
});

//Functions
var addCamera=function(message)
{
	console.log("API CALL -updateDeviceList",message);
	var parsedJson = parseJson(message);
	console.log("\n  New Device to test in the list::",parsedJson);

	var Device_Information_temp="./Device_Information_temp"
	var device_information = parsedJson.deviceType+"\n"+parsedJson.deviceName+"\n"+parsedJson.deviceId+"\n"+parsedJson.streamingUrl+"\n"+parsedJson.location+"\n"+parsedJson.technicalInfo;
	//console.log("\nDevice_Information:::",device_information);
	fs.writeFileSync(Device_Information_temp, device_information);

	var python = require('child_process').spawn('python',
	["testDevice.py"]);
	var output = "";
	python.stdout.on('data', function(data){ output = data });
	python.on('close', function(code)
	{ 
	  var body=output;
	  console.log("  Device Test Results::",output);
	  var d={"flag":output.toString().replace(/\r?\n|\r/g, "")};
	  var dd=JSON.stringify(d);
	
	  console.log(typeof(dd));console.log("Data::",dd);
	  client.publish('addCameraResponse', dd);
	});
}

var updateDeviceList=function(message)
{
	console.log("API CALL -updateDeviceList");
	var Device_Information="./Device_Information"
	var parsedJson = parseJson(message);
	console.log("\n  New Device to add in the list::",parsedJson);

	var device_information = parsedJson.camId+" "+parsedJson.streamingUrl;
	console.log("  Device_Information::",device_information);
	fs.open(Device_Information,'r',function(err, fd)
	{
	  if (err) 
	  {
	    fs.writeFileSync(Device_Information, device_information);
	  } 
	  else 
	  {
	    device_information = "\n"+device_information;
	    fs.appendFileSync(Device_Information, device_information);
	  }
	});
}

var checkForExistingEntries = function(camId, callback){

	fs.open('./bboxdata','r',function(err, fd)
	{
		if(err)
		{
			console.log("ERROR FILE READING");
			callback(err);
		}else
		{
			var device_data = fs.readFileSync("./bboxdata").toString().split('\n');

			//console.log("After split : "+device_data.length);
			var deviceUpdateList = [];
			device_data.forEach(function(device, i)
			{
				var localCam = device.split(' ')[0];
				//console.log("LOCALCAM ::"+device.length);
				if(device.length!==0)
				{
					if(camId !== localCam)
					{
							var tempStr = device + '\n';
							deviceUpdateList.push(tempStr);
							//console.log("Adding updated Line :"+device);
					}	
				}
			});

			var last_device = deviceUpdateList[deviceUpdateList.length-1];
			if(last_device.slice(-1) === '\n')
			{
				last_device = last_device.substring(0, last_device.length - 1);
				deviceUpdateList[deviceUpdateList.length-1]=last_device;
			}
				
			console.log("___________________________________________________");
		    	var filename5='.'+'/bboxdata'
			console.log("FileName::",filename5)
			if(deviceUpdateList.length !== 0){
				fs.writeFileSync(filename5, deviceUpdateList.join(''));
				callback(null);
			}
			else
			{
				fs.unlinkSync(filename5);
				callback(null);
			}
		}
	});
}

var startLiveStreaming = function(camId,detection_type){

	var pyshell = new PythonShell('livestreaming.py');

	var array = [];
  	array.push(detection_type)
    array.push(camId);
	var datastreaming = JSON.stringify(array);
	
	console.log("Data to livestream::",datastreaming);
	console.log("Starting live streaming now!!");
	pyshell.send(datastreaming);

	pyshell.on('message', function (message){
	    console.log(message);
	});

	pyshell.end(function (err){
	    if (err){
		throw err;
	    };
	    console.log('finished the python script');
	});
}

var createConfigurationFiles=function(camId,detection_type,boxes,parsedJson)
{
	//To refer current bounding box
	var bboxfile='/home/ubuntu/surveillance/jetson-dl/jetson-inference/build/aarch64/bin/Cameras/bbox';
	var bounding_boxes=[];
	boxes.forEach(function(box,i)
	{
		if(i===0)
	    	var co_ords = "";
		else
	    	var co_ords ="\n";
	    var co_ords = co_ords + camId+" "+detection_type+" "+box.x + " "+box.y+" "+box.x2+" "+box.y2;
		bounding_boxes.push(co_ords); 
	});

	fs.writeFileSync(bboxfile, bounding_boxes.join(''));

	var configfile='/home/ubuntu/surveillance/jetson-dl/jetson-inference/build/aarch64/bin/Cameras/config';
	var configurations = parsedJson.frameWidth.width+" "+parsedJson.frameWidth.height;
	fs.writeFileSync(configfile, configurations);
}

var boundingBox=function(message)
{
	console.log("API CALL -boundingBox");
	var parsedJson = parseJson(message);
	console.log("\n  New bounding boxes::",parsedJson);

	var camId = parsedJson.camId;
	console.log("\n  CamId:::",camId);

	camera_folder='/home/ubuntu/surveillance/jetson-dl/jetson-inference/build/aarch64/bin/Cameras/'+'Cam'+camId;

	/*if (!fs.existsSync(camera_folder)) 
	{*/
		mkdirp(camera_folder, function(err)
		{
		if (err) 
		{
		    return console.error(err);
		}  
		console.log("Directory created successfully!");
		});
	//}

	checkForExistingEntries(camId, function(err){

		if(err){
			console.log("\n  No previos bounding boxes found!!!");
		}
		var detection_type_str = parsedJson.feature;
		var detection_type="";
		if(detection_type_str=='humanDetection')
		{
		    detection_type="0";
		}
		else
		{
			detection_type="1";
		}

		var boxes = parsedJson.Coords;
	 	//console.log("\n  Bounding boxes:: ",boxes);
		
		var added_bounding_boxes=[]

		var bboxdata='./bboxdata';
		
		fs.open(bboxdata,'r',function(err, fd)
		{
		    if (err) 
		    {
		    	boxes.forEach(function(box,i){
		    		if(i===0)
				    	var co_ords = "";
					else
				    	var co_ords ="\n";
				    var co_ords = co_ords + camId+" "+detection_type+" "+box.x + " "+box.y+" "+box.x2+" "+box.y2;
					added_bounding_boxes.push(co_ords); 
		    	});
				fs.writeFileSync(bboxdata, added_bounding_boxes.join(''));
				console.log('Bounding boxes  saved! New file created');
		    } else 
		    {
		    	boxes.forEach(function(box){
				    var co_ords = "\n"+camId+" "+detection_type+" "+box.x + " "+box.y+" "+box.x2+" "+box.y2;
					added_bounding_boxes.push(co_ords); 
		    	});
				fs.appendFileSync(bboxdata, added_bounding_boxes.join(''));
				console.log('Bounding boxes saved!');
		    }
		});	
		
		startLiveStreaming(camId,detection_type); //,function(){console.log("BACK from STREAMING!!");}
		createConfigurationFiles(camId,detection_type,boxes,parsedJson);//,function(){console.log("BACK from STREAMING!!");}

		console.log("_______________________________JETSON::DETECTNET-CONSOLE OUTPUT______________________________________");
		
		ls = exec('cd /home/ubuntu/surveillance/jetson-dl/jetson-inference/build/aarch64/bin ; ./detectnet-console');

		ls.stdout.on('data', function (data) {
  			//console.log('stdout: ' + data);
		});

		ls.stderr.on('data', function (data) {
  			//console.log('stderr: ' + data);
		});

		ls.on('close', function (code) {
  		console.log('child process exited with code ' + code);
		});
	});
}

var getRawImage=function(message)
{
	var pyshell = new PythonShell('getRawImage.py');
	parsedJson = parseJson(message);

	feature = parsedJson.feature;
	camId = parsedJson.camId;
	
	camera_folder='/home/ubuntu/surveillance/jetson-dl/jetson-inference/build/aarch64/bin/Cameras/'+'Cam'+camId;

	/*if (!fs.existsSync(camera_folder)) 
	{*/
		mkdirp(camera_folder, function(err)
		{
		if (err) 
		{
		    return console.error(err);
		}  
		console.log("Directory created successfully!");
		});
	//}

	var array = [];
	if(feature=='humanDetection')
	{
	    array.push("0");
	}
	else
	{
		array.push("1");
	}
	array.push(camId);
	cam_arr=JSON.stringify(array)
	pyshell.send(cam_arr);
	pyshell.on('message', function (message) {
	    console.log(message);
	});

	pyshell.end(function (err) {
	    if (err){
		throw err;
	    };
	    console.log('finished the python script');
	});
}

var stopCamera=function(camId,callback)
{
	console.log('  Stopping Camera:: '+camId);
    	var pyshell = new PythonShell('stopCamera.py');
	//var pyshell = new PythonShell('stopAllCamera.py');
    	var array = [];
	array.push(camId);

	cam_arr=JSON.stringify(array);
	console.log("Camera::"+cam_arr);
	
	pyshell.send(cam_arr);
	pyshell.on('message', function (message) {
	console.log(message);
	});

	pyshell.end(function (err) {
	if (err){
	 	throw err;
	}
	 else{
			console.log('  STOPPED the Camera:: '+camId);
	 };
	     callback();
	 });
}

var stopAllCamera=function()
{
	var python = require('child_process').spawn('python',
     ["./stopAllCamera.py"
     ]
     );
     var output = "";
     python.stdout.on('data', function(data){ output += data });
     python.on('close', function(code)
     { 
		console.log("  STOPPED all cameras(Livestreaming and Processing)..!!");
     });
    if (fs.existsSync(stopProcessing)) {
     fs.unlinkSync(stopProcessing);
	}
    if (fs.existsSync(stopProcessingDetectnet)) {
     fs.unlinkSync(stopProcessingDetectnet);
	}
}

var port = 3001;
app.listen(port);
console.log('\n=========PROJECT HEIMDALL=========\n\n**SERVER STATUS :: \n	Project Heimdall Server is Available to Respond!!\n	Listening on port :: ',port);

