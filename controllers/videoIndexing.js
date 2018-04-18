var PythonShell = require('python-shell');
var request = require("request");
var fs = require('fs');

var config = require('../config');

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

module.exports.videoStorage = videoStorage;
module.exports.videoUploading = videoUploading;
