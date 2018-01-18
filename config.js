var config = {
"AzureServerUrl":"http://assetmonitoring.azurewebsites.net/",
"Version":"1.01",
"port":3001,
"mqttBroker":"mqtt://10.9.43.104:1885",
"host":"http://10.9.42.211:5009",
"cloudComputeEngine":"http://52.177.169.81:5003",

"jetsonFolderPath":":/home/nvidia/surveillance/jetson-dl/jetson-inference/build/aarch64/bin/Cameras/Cam",

"sendLiveStreamUploadURL":"/images","camFolder":"./Cameras","livestreamingCamFolder":"./Cameras/Cam",
"cloudServiceUrl":"http://localhost:5003/faces",
"cloudServiceTargetUrl":"http://10.9.42.211:5009/results",
"aggregatorName" : "Aggregator 01",
"location": "4rth Floor Amar Apex","channelId":"32",
"url" : "rtsp://<username>:<password>@<ip_address>:<port>/cam/realmonitor?channel=<id>&subtype=0",
"availability" :"yes",
"registerAggregator":"http://10.9.42.211:5009/devices/aggregators"};
module.exports = config;
