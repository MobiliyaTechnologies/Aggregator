var videoUploading = require('../controllers/videoIndexing').videoUploading;
/**
 * API communication
 * @param {*} app 
 */
module.exports = function (app) {
    app.post('/videoUploading',videoUploading);
}
