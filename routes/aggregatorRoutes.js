var videoUploading = require('../controllers/videoIndexing').videoUploading;
var videoRetention = require('../controllers/videoRetention').getVideoData;

/**
 * API communication
 * @param {*} app 
 */
module.exports = function (app) {
    app.post('/videoUploading',videoUploading);
    app.post('/videoRetention',videoRetention);
}
