var logger = require('./logger');

logger.config({
    service: "AS",
    level: 3,
})

exports.logger = logger;