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

    if (videoSourceData.videoUrl) {
        urlVideoIndexer(videoSourceData);
    } else {
        if (videoSourceData.record) {
            videoSourceData.callbackUrl = config.sendBlobUploadStatus;
        }else{
            videoSourceData.videoId = null;
        }
        var d = new Date(videoSourceData.datetime);
        var arr = [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()];
        console.log(arr);
        var pyshell = new PythonShell(config.videoIndexer.scheduleWriter);
        var videoSourceInput = [];
        videoSourceInput.push(videoSourceData.streamingUrl, videoSourceData.camId, videoSourceData.duration,
            d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(),
            config.videoIndexer.localVideoUploadCallUrl,
            videoSourceData.callbackUrl, videoSourceData.filename, videoSourceData.record, videoSourceData.videoId);

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
}

//upload url
var urlVideoIndexer = function (videoSourceData) {


    var uploadVideoUrl =
        config.videoIndexer.url + '?name=' + videoSourceData.filename + '&videoUrl=' + videoSourceData.videoUrl + '&privacy=' + config.videoIndexer.privacy + '&callbackUrl=' + videoSourceData.callbackUrl;
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
}

var videoUploadingToBlob = function (req) {
    var filePath = req.body.filePath;
    var callbackUrl = req.body.callbackUrl;
    var fileName = req.body.fileName;
    var blobName = fileName;
    var videoUrl = config.videoIndexer.containerUrl + blobName;
    var readStream = fs.createReadStream(filePath);

    console.log("Video Url", videoUrl);
    readStream.pipe(blobService.createWriteStreamToBlockBlob(containerName, blobName, function (error, result, response) {
        if (!error) {
            console.log("Video uploaded to blob");
            req.videoUrl = videoUrl;
            var options = {
                uri: callbackUrl,
                method: 'POST',
                json: {
                    //"fileName": fileName,
                    "videoUrl": videoUrl,
                    "videoId":req.body.videoId
                }
            };
            request(options, function (error, response, body) {
                console.log(body);
                if (!error && response.statusCode == 200) {
                    console.log("Video recording done response posted\n");
                } else {
                    console.log("Error in posting Video recording done response:", error);
                }
            });
        } else {
            console.log("Couldnt upload video to azure blob\n", error);
        }
    }));
}

/**
 * Upload recorded video
 * @param {*} req 
 * @param {*} res 
 */
var videoUploading = function (req, res) {
    console.log("Video recording done for video - ",req.body.fileName);
    console.log("\n\nVideo Uploading Call", req.body);
    var filePath = req.body.filePath;
    var callbackUrl = req.body.callbackUrl;
    var fileName = req.body.fileName;
    var record = req.body.record;
    if (record) {
        videoUploadingToBlob(req);
    } else {
        var uploadVideoUrl =
            config.videoIndexer.url + '?name=' + fileName + '&privacy=' + config.videoIndexer.privacy + '&callbackUrl=' + callbackUrl;
        const readStream = fs.createReadStream(filePath);

        const requestOptions = {
            formData: {
                file: readStream
            },
            headers: {
                "Content-Type": "multipart/form-data",
                "Ocp-Apim-Subscription-Key": config.videoIndexer.subscriptionKey //"fb1edaf45a6b48abb38ae4fdbe3f6d1a"
            },
            method: 'POST',
            url: uploadVideoUrl
        };

        request(requestOptions)
            .on('end', () => {
                console.log("Video Uploaded for video indexing..!!");
            });
    }
}

module.exports.videoStorage = videoStorage;
module.exports.videoUploading = videoUploading;
