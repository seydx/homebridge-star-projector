/**
 * v1.0
 *
 * @url https://github.com/SeydX/homebridge-star-projector
 * @author SeydX <seyd55@outlook.de>
 *
 **/

'use strict';

module.exports = function (homebridge) {
  let StarProjector = require('./src/platform.js')(homebridge);
  homebridge.registerPlatform('homebridge-star-projector', 'StarProjector', StarProjector, true);
};
