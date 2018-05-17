var PythonShell = require('python-shell');
var request = require("request");
var fs = require('fs');
const storage = require('azure-storage');

var config = require('../config');

var blobService = storage.createBlobService(config.blobConfiguration.account, config.blobConfiguration.accessKey);
var containerName = config.videoIndexer.containerName;

/**
 * videoIndexing function  : write video of given time on given time
 * @param {*} videoSourceData 
 */
var videoStorage = function (videoSourceData) {
    console.log("CALL -videoStorage", videoSourceData);
    var d = new Date(videoSourceData.datetime);
    var arr = [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()];
    console.log(arr);
    var pyshell = new PythonShell(config.videoIndexer.scheduleWriter);
    var videoSourceInput = [];
    videoSourceInput.push(videoSourceData.streamingUrl, videoSourceData.camId, videoSourceData.duration,
        d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(),
        config.videoIndexer.localVideoUploadCallUrl,
        videoSourceData.callbackUrl, videoSourceData.filename);

    var videoToStream = JSON.stringify(videoSourceInput);
    pyshell.send(videoToStream);
    console.log("VideoData to stream ::" + videoToStream);

    pyshell.on('message', function (message) {
        console.log("  Video Storing Test Results::", message);
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


/**
 * Upload recorded video
 * @param {*} req 
 * @param {*} res 
 */
var videoUploading = function (req, res) {
    console.log("\n\nVideo Uploading Call", req.body);
    var filePath = req.body.filePath;
    var callbackUrl = req.body.callbackUrl;
    var fileName = req.body.fileName;
    var blobName = fileName.split(".")[0] + new Date().getTime();
    var videoUrl = config.containerUrl + blobName;
    var readStream = fs.createReadStream(fileName);
    
    readStream.pipe(blobService.createWriteStreamToBlockBlob(containerName, blobName, function (error, result, response) {
        if (!error) {
            console.log("Video uploaded to blob");
            var uploadVideoUrl =
                config.videoIndexer.url + '?name=' + fileName + '?videoUrl=' + videoUrl + '&privacy=' + config.videoIndexer.privacy + '&callbackUrl=' + callbackUrl;
            const readStream = fs.createReadStream(filePath);
            const requestOptions = {
                headers: {
                    "Content-Type": "multipart/form-data",
                    "Ocp-Apim-Subscription-Key": config.videoIndexer.subscriptionKey 
                },
                method: 'POST',
                url: uploadVideoUrl
            };

            request(requestOptions)
                .on('end', (error, response, body) => {
                    console.log("Video Uploaded for video indexing..!");
                });
        } else {
            console.log("Couldnt upload video to azure blob\n", error);
        }
    }));
}

module.exports.videoStorage = videoStorage;
module.exports.videoUploading = videoUploading;
