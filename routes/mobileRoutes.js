var apiController = require('../controllers/apiController');

/**
 * API communication
 * @param {*} app 
 */
module.exports = function (app) {
    app.post('/sendImage', apiController.receiveMobileImages);
}