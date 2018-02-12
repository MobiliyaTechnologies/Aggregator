var fs = require('fs');
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
 * 
 * @param {*string} imageName filename
 * @param {*string} camId camera Id
 * @param {*function} callback 
 */
var deWrapImage = function (imageName, camId, callback) {
    var sourcePath = config.imageDirectory + '/' + imageName;

    var targetPath = [];
    var imageNameArray = imageName.split(".");
    imageNameArray.push(imageNameArray[imageNameArray.length - 1]);

    imageNameArray[imageNameArray.length - 2] = "_1.";
    targetPath.push(imageNameArray.join(""));
    imageNameArray[imageNameArray.length - 2] = "_2.";
    targetPath.push(imageNameArray.join(""));
    imageNameArray[imageNameArray.length - 2] = "_3.";
    targetPath.push(imageNameArray.join(""));
    imageNameArray[imageNameArray.length - 2] = "_4.";
    targetPath.push(imageNameArray.join(""));
    //console.log("Renamed Images are  ::",targetPath);

    ls = exec('./fisheye -o 120 -c 521,518 -l 248,518 -r 420 420x420 ' + sourcePath + ' ' + config.imageTargetDirectory + '/' + targetPath[0],
        function (err, stdout, stderr) {
            console.log("-----------------------------ONE DWARP\n\n");
            rsyncInterval(0, targetPath[0], config.imageTargetDirectory + '/' + targetPath[0], camId);
            sendImages(targetPath[0], config.imageTargetDirectory + '/' + targetPath[0]);
        });

    ls = exec('./fisheye -o 120 -c 521,518 -l 521,248 -r 420 420x420 ' + sourcePath + ' ' + config.imageTargetDirectory + '/' + targetPath[1],
        function (err, stdout, stderr) {
            console.log("-----------------------------TWO DWARP\n\n");
            rsyncInterval(2000, targetPath[1], config.imageTargetDirectory + '/' + targetPath[1], camId);
            sendImages(targetPath[1], config.imageTargetDirectory + '/' + targetPath[1]);
        });

    ls = exec('./fisheye -o 120 -c 521,518 -l 521,766 -r 420 420x420 ' + sourcePath + ' ' + config.imageTargetDirectory + '/' + targetPath[2],
        function (err, stdout, stderr) {
            console.log("-----------------------------THREE DWARP\n\n");
            rsyncInterval(4000, targetPath[2], config.imageTargetDirectory + '/' + targetPath[2], camId);
            sendImages(targetPath[2], config.imageTargetDirectory + '/' + targetPath[2]);
        });

    ls = exec('./fisheye -o 120 -c 521,518 -l 766,500 -r 440 420x420 ' + sourcePath + ' ' + config.imageTargetDirectory + '/' + targetPath[3],
        function (err, stdout, stderr) {
            console.log("-----------------------------FOUR DWARP\n\n");
            rsyncInterval(6000, targetPath[3], config.imageTargetDirectory + '/' + targetPath[3], camId);
            sendImages(targetPath[3], config.imageTargetDirectory + '/' + targetPath[3]);
        });
    callback(null);
}

module.exports.base64_encode = base64_encode;
module.exports.deWrapImage = deWrapImage;