var apiController = require('../controllers/apiController');

module.exports = function (app) {
    app.post('/sendImage', apiController.receiveMobileImages);
}