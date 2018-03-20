var apiController = require('../controllers/apiController');
var videoUploading = require('../controllers/videoIndexing').videoUploading;
/**
 * API communication
 * @param {*} app 
 */
module.exports = function (app) {
    app.post('/sendImage', apiController.receiveMobileImages);
    app.post('/videoUploading',videoUploading);
}