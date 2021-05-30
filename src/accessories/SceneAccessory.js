'use strict';

const Logger = require('homebridge-star-projector/src/helper/logger');
const ColorUtils = require('../helper/utils');

class SceneAccessory {
  constructor(api, accessory, tuya) {
    this.api = api;
    this.accessory = accessory;
    this.dps = accessory.context.config.dps;

    this.tuya = tuya;
    this.getService();
  }

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // Services
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

  getService() {
    this.switchService = this.accessory.getService(this.api.hap.Service.Switch);

    if (!this.switchService) {
      Logger.info('Adding Switch service (scene)', this.accessory.displayName);
      this.switchService = this.accessory.addService(this.api.hap.Service.Switch, this.accessory.displayName);
    }

    this.switchService.getCharacteristic(this.api.hap.Characteristic.On).onSet(this.setScene.bind(this));
  }

  async setScene(state) {
    try {
      if (!state) {
        return;
      }

      const scene = {
        static: this.accessory.context.config.mode === 'STATIC',
        flash: this.accessory.context.config.mode === 'FLASH',
        breath: this.accessory.context.config.mode === 'BREATH',
        rotation: this.accessory.context.config.rotation,
        colors: ColorUtils.generateTuyaColorFromString(this.accessory.context.config.colors),
      };

      const data = {};
      data[this.dps.mode] = 'scene';
      data[this.dps.color] = ColorUtils.convertToScene(scene);

      await this.tuya.set({
        multiple: true,
        data: data,
      });

      Logger.info(`Scene: ${JSON.stringify(scene)}`, this.accessory.displayName);
    } catch (err) {
      Logger.warn('An error occured during sending scene cmd!', this.accessory.displayName);
      Logger.error(err);
    }

    setTimeout(() => {
      this.switchService.getCharacteristic(this.api.hap.Characteristic.On).updateValue(false);
    }, 500);
  }
}

module.exports = SceneAccessory;
