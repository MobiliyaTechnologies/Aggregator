var config = {"AzureServerUrl":"http://assetmonitoring.azurewebsites.net/","Version":"1.01","port":3001,"mqttBroker":"mqtt://52.177.169.81:1887","host":"http://52.177.169.81:5008","cloudComputeEngine":"http://52.177.169.81:5003","jetsonFolderPath":"ubuntu@10.9.44.132:/home/ubuntu/surveillance/jetson-dl/jetson-inference/build/aarch64/bin/Cameras/Cam","sendLiveStreamUploadURL":"/images","camFolder":"./Cameras","livestreamingCamFolder":"./Cameras/Cam","cloudServiceUrl":"http://52.177.169.81:5003/faces","cloudServiceTargetUrl":"http://52.177.169.81:5008/results","aggregatorName" : "Aggregator 01","location": "4rth Floor Amar Apex","channelId":"32","url" : "rtsp://<username>:<password>@<ip_address>:<port>/cam/realmonitor?channel=<id>&subtype=0","availability" :"yes"};
module.exports = config;
