'use strict';

const winston = require('winston');

const logger = new winston.Logger();

if (!process.env.DISABLE_LOGGING) {
    logger.add(winston.transports.Console, {
        level: 'info',
        colorize: true,
        timestamp: !true
    });
}

module.exports = logger;
