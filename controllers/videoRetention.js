var PythonShell = require('python-shell');
var request = require("request");
var fs = require('fs');
const storage = require('azure-storage');

var config = require('../config');

//Azure Blob to store video files
var blobService = storage.createBlobService(config.blobConfiguration.account, config.blobConfiguration.accessKey);
var containerName = config.videoIndexer.containerName;

var videoMap = new Map();

// videoSourceData = {
//     "streamingUrl": "rtsp://komal:AgreeYa@114.143.6.99:554/cam/realmonitor?channel=1&subtype=0",
//     "camId": "12",
//     "retentionPeriod": 1,
//     "deviceName":"Cam1",
//     "date": '2018-6-1',
//     "duration": '15:41 - 15:51',
//     "fileName": '12_34.avi',
//     "filePath": './cam10-face-2.1.avi',
//     "videoUrl": 'https://snsdiag148.blob.core.windows.net/videoindexer/12_33.avi' 
// }
// videoMap.set("12",videoSourceData);

var getVideoData = function (req, res) {
    console.log("Video Data - ", req.body.camId);
    res.end("done");
    data = videoMap.get(req.body.camId);
    console.log("From map -",data);
    
    if (data.filePath) {
        retentionVideoUploadToBlob(data, function (videoUrl) {
            if (videoUrl) {
                data.videoUrl = videoUrl;

                var options = {
                    uri: config.sendBlobUploadStatus,
                    method: 'POST',
                    json: data
                };
                request(options, function (error, response, body) {
                    console.log(body);
                    if (!error) {
                        console.log("Video recording done response posted");
                    } else {
                        console.log("Error in posting Video recording done response:", error);
                    }
                });
            }
        });
    }
    videoData = Object.assign(data, req.body);
    videoMap.set(videoSourceData.camId, videoData);
}

var videoRetentionRecording = function (videoSourceData) {
    var videoSourceInput = [];
    videoSourceInput.push(videoSourceData.camId, videoSourceData.streamingUrl);

    var pyshell = new PythonShell("videoRetention.py");
    var videoToStream = JSON.stringify(videoSourceInput);
    // console.log("VideoData to stream ::" + videoToStream);

    uploadedVideoData = {
        "camId": videoSourceData.camId,
        "deviceName": videoSourceData.deviceName,
        "retentionPeriod": videoSourceData.retentionPeriod,
    }
    videoMap.set(videoSourceData.camId, uploadedVideoData);
    console.log("Updated --", videoMap);
    
    pyshell.send(videoToStream);
    pyshell.on('message', function (message) {
        console.log(message);
    });

    pyshell.end(function (err) {
        if (err) {
            console.log("   Python result:: Python Error in streaming and storing!", err);
        }
        else {
            console.log("   Python result:: Video Storing Done!");
        }
    });
}

var retentionVideoUploadToBlob = function (videoDetails,callback) {
    var filePath = videoDetails.filePath;
    console.log(filePath);
    var blobName = videoDetails.fileName;
    var videoUrl = config.videoIndexer.containerUrl + blobName;

    var readStream = fs.createReadStream(filePath);

    readStream.pipe(blobService.createWriteStreamToBlockBlob(containerName, blobName, function (error, result, response) {
        if (!error) {
            console.log("Blob upload Success - VideoUrl", videoUrl);
            callback(videoUrl);
        } else {
            console.log("Couldnt upload video to azure blob\n", error);
            callback(null);
        }
    }));
}

var stopRetention = function (camId) {
    data = videoMap.get(camId);

    if (data.filePath) {
        retentionVideoUploadToBlob(data, function (videoUrl) {
            if (videoUrl) {
                data.videoUrl = videoUrl;
                var options = {
                    uri: config.sendBlobUploadStatus,
                    method: 'POST',
                    json: data
                };
                console.log(data);
                request(options, function (error, response, body) {
                    console.log(body);
                    if (!error) {
                        console.log("Video recording done response posted");
                    } else {
                        console.log("Error in posting Video recording done response:", error);
                    }
                });
            }
        });
    }
}

module.exports.getVideoData = getVideoData;
module.exports.videoRetentionRecording = videoRetentionRecording;