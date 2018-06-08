var PythonShell = require('python-shell');
var request = require("request");
var fs = require('fs');
const storage = require('azure-storage');

var config = require('../config');

//Azure Blob to store video files
var blobService = storage.createBlobService(config.blobConfiguration.account, config.blobConfiguration.accessKey);
var containerName = config.videoIndexer.containerName;

var videoMap = new Map();

var getVideoData = function (req, res) {
    // console.log("Video Data - ", req.body.camId);
    res.end("done");
    data = videoMap.get(req.body.camId);
    // console.log("From map -", data);

    if (data.filePath && !(data.uploadedFlag)) {
        data.uploadedFlag = true;
        videoMap.set(req.body.camId, data);
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
                        console.log("\n\n***Video recording done response posted - "+ data.filePath + " \n\n");
                        // fs.unlink(data.filePath);
                    } else {
                        console.log("Error in posting Video recording done response:", error);
                    }
                });
            }
        });
    }
    data.uploadedFlag = false;
    videoData = Object.assign(data, req.body);
    videoMap.set(req.body.camId, videoData);
    // console.log("Newly added - ", videoMap);
}

var videoRetentionRecording = function (videoSourceData) {
    console.log("Video Retention started for  ::" + videoSourceData.camId);
    switch (videoSourceData.deviceType) {
        case 'IP':
            console.log("Checking IP camera");
            videoSourceData.streamingUrl = "uridecodebin uri=" + streamingUrl + " ! videoconvert ! videoscale ! appsink";
    }
    //webcam
    if (videoSourceData.streamingUrl === "0")
        videoSourceData.streamingUrl = parseInt(streamingUrl)

    var videoSourceInput = [];

    videoSourceInput.push(videoSourceData.camId, videoSourceData.streamingUrl, config.videoRetention.localVideoUploadCallUrl);

    var pyshell = new PythonShell("videoRetention.py");
    var videoToStream = JSON.stringify(videoSourceInput);
   

    uploadedVideoData = {
        "camId": videoSourceData.camId,
        "deviceName": videoSourceData.deviceName,
        "retentionPeriod": videoSourceData.retentionPeriod,
        "uploadedFlag": false,
        "pid": pyshell.childProcess.pid,
        "videoName": videoSourceData.videoName
    }
    videoMap.set(videoSourceData.camId, uploadedVideoData);
    // console.log("Updated --", videoMap);

    pyshell.send(videoToStream);
    pyshell.on('message', function (message) {
        // console.log(message);
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

var retentionVideoUploadToBlob = function (videoDetails, callback) {
    var filePath = videoDetails.filePath;
    // console.log(filePath);
    var blobName = videoDetails.fileName;
    var videoUrl = config.videoIndexer.containerUrl + blobName;
    blobService.createBlockBlobFromLocalFile(containerName, blobName, filePath,
        function (error, result, response) {
            if (!error) {
                console.log("\n\n***Blob upload Success - VideoUrl- "+ videoUrl+ "\n\n");
                callback(videoUrl);
            } else {
                console.log("Couldnt upload video to azure blob\n", error);
                callback(null);
            }
        });
}

var stopRetention = function (camId) {
    data = videoMap.get(camId);
    var stopTime = new Date();

    if (data) {
        console.log("Stoping Video Retention of camera -", camId);
        try {
            process.kill(data.pid);
        } catch (e) {
            console.log("Process not found!");
        }
        if (data.filePath && !(data.uploadedFlag)) {
            retentionVideoUploadToBlob(data, function (videoUrl) {
                data.timeInterval = data.timeInterval.split("-")[0] + " - " + stopTime.getHours() + ":" + stopTime.getMinutes();
                if (videoUrl && data) {
                    data.videoUrl = videoUrl;
                    var options = {
                        uri: config.sendBlobUploadStatus,
                        method: 'POST',
                        json: data
                    };
                    // console.log(data);
                    request(options, function (error, response, body) {
                        // console.log(body);
                        if (!error) {
                            console.log("\n\n***Video recording done response posted -"+ data.filePath + " \n\n");
                            videoMap.delete(camId);
                            // fs.unlink(data.filePath);
                        } else {
                            console.log("Error in posting Video recording done response:", error);
                        }
                    });
                }
            });
        }
    } else {
        console.log("Camera is not retended - ", camId);
    }
}

//ps -ef |grep detectnet-console | awk '{print $2}'| xargs kill -9

module.exports.getVideoData = getVideoData;
module.exports.videoRetentionRecording = videoRetentionRecording;
module.exports.stopRetention = stopRetention;
