var fs = require('fs');
var exec = require('child_process').exec;
var config = require('../config');

const storage = require('azure-storage');

var blobService = storage.createBlobService(config.blobConfiguration.account, config.blobConfiguration.accessKey);
var containerName = config.blobConfiguration.containerName;

/**
* to convert image to base64 format
* @param {*string} file image filepath to be converted to base64  
*/
var base64_encode = function (file) {
    // read binary data
    var bitmap = fs.readFileSync(file);

    // convert binary data to base64 encoded string
    return new Buffer(bitmap).toString('base64');
}

/**
 * 360 Dwarp
 * @param {*} sourceImageName 
 * @param {*} sourceImageFullPath 
 * @param {*} destinationImageFolderPath 
 * @param {*} callback 
 */
var deFishEyeImage = function (sourceImageName, sourceImageFullPath, destinationImageFolderPath,
    callback) {

    var destinationImageFullPath = destinationImageFolderPath + "/" + sourceImageName;
    //console.log("Destin : :-", destinationImageFullPath);
    var command = './fisheye2pano -w 720 -e 50 -h 0,360 -f L -p 90 -c 360,360 -v -90,0 -r 360 -vp black -b black '
        + sourceImageFullPath + ' ' + destinationImageFullPath;

    ls = exec(command,
        function (err, stdout, stderr) {
            if (err) {
                console.log("Error in dwarping :", err);
            } else {

                console.log("-----------------------------DWARP Done of IMAGE ::" + sourceImageFullPath);
                callback(sourceImageName, destinationImageFullPath);

            }
        });
}

/**
 * Download image from blob
 * @param {*} blobName 
 * @param {*} imageFullPath 
 * @param {*} callback 
 */
var downloadBlob = function (blobName, imageFullPath, callback) {
    // console.log("Blob name - ",blobName);
    blobService.getBlobToLocalFile(containerName, blobName, imageFullPath, err => {
        if (err) {
            console.log("Error");
        } else {
            // console.log({ message: `Download of '${blobName}' complete` });
            blobService.deleteBlobIfExists(containerName, blobName,
                function (error, result) {
                    if (error) { 
                        console.log("Error in deleting blob - ",error);
                    } 
                });
            callback();
        }
    });
}

module.exports.base64_encode = base64_encode;
module.exports.deFishEyeImage = deFishEyeImage;
module.exports.downloadBlob = downloadBlob;
