'use strict';

const Logger = require('../helper/logger');
const ColorUtils = require('../helper/utils');

class ProjectorAccessory {
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
    this.switchService = this.accessory.getServiceById(this.api.hap.Service.Switch, 'state');
    this.fanService = this.accessory.getServiceById(this.api.hap.Service.Fanv2, 'rotation');
    this.lightbulbLaserService = this.accessory.getServiceById(this.api.hap.Service.Lightbulb, 'laser');
    this.lightbulbColorService = this.accessory.getServiceById(this.api.hap.Service.Lightbulb, 'color');

    //Switch Service
    if (!this.switchService) {
      Logger.info('Adding Switch service (scene)', this.accessory.displayName);
      this.switchService = this.accessory.addService(this.api.hap.Service.Switch, 'State', 'state');
    }

    this.switchService.getCharacteristic(this.api.hap.Characteristic.On).onSet(this.setPowerState.bind(this));

    //Fan Service
    if (this.accessory.context.config.starRotation) {
      if (!this.fanService) {
        Logger.info('Adding Fan service (rotation)', this.accessory.displayName);
        this.fanService = this.accessory.addService(this.api.hap.Service.Fanv2, 'Rotation', 'rotation');

        this.fanService.addCharacteristic(this.api.hap.Characteristic.RotationSpeed);
      }

      this.fanService.getCharacteristic(this.api.hap.Characteristic.RotationSpeed).setProps({
        minValue: 1,
      });

      this.fanService
        .getCharacteristic(this.api.hap.Characteristic.RotationSpeed)
        .onSet(this.setRotationSpeed.bind(this));
    } else {
      if (this.fanService) {
        this.accessory.removeService(this.fanService);
      }
    }

    //Lightbulb Color Service
    if (this.accessory.context.config.color) {
      if (!this.lightbulbColorService) {
        Logger.info('Adding Lightbulb service (color)', this.accessory.displayName);
        this.lightbulbColorService = this.accessory.addService(this.api.hap.Service.Lightbulb, 'Color', 'color');

        this.lightbulbColorService.addCharacteristic(this.api.hap.Characteristic.Brightness);
        this.lightbulbColorService.addCharacteristic(this.api.hap.Characteristic.Hue);
        this.lightbulbColorService.addCharacteristic(this.api.hap.Characteristic.Saturation);
      }

      this.lightbulbColorService.getCharacteristic(this.api.hap.Characteristic.On).onSet(this.setColorState.bind(this));
      this.lightbulbColorService.getCharacteristic(this.api.hap.Characteristic.Hue).onSet((value) =>
        this.setColor({
          hue: value,
          saturation: this.lightbulbColorService.getCharacteristic(this.api.hap.Characteristic.Saturation).value,
          brightness: this.lightbulbColorService.getCharacteristic(this.api.hap.Characteristic.Brightness).value,
        })
      );
      this.lightbulbColorService.getCharacteristic(this.api.hap.Characteristic.Brightness).onSet((value) =>
        this.setColor({
          hue: this.lightbulbColorService.getCharacteristic(this.api.hap.Characteristic.Hue).value,
          saturation: this.lightbulbColorService.getCharacteristic(this.api.hap.Characteristic.Saturation).value,
          brightness: value,
        })
      );
    } else {
      if (this.lightbulbColorService) {
        this.accessory.removeService(this.lightbulbColorService);
      }
    }

    //Lightbulb Laser Service
    if (this.accessory.context.config.laser) {
      if (!this.lightbulbLaserService) {
        Logger.info('Adding Lightbulb service (laser)', this.accessory.displayName);
        this.lightbulbLaserService = this.accessory.addService(this.api.hap.Service.Lightbulb, 'Laser', 'laser');

        this.lightbulbLaserService.addCharacteristic(this.api.hap.Characteristic.Brightness);
      }

      this.lightbulbLaserService.getCharacteristic(this.api.hap.Characteristic.On).onSet(this.setLaserState.bind(this));
      this.lightbulbLaserService
        .getCharacteristic(this.api.hap.Characteristic.Brightness)
        .onSet(this.setLaserBrightness.bind(this));
    } else {
      if (this.lightbulbLaserService) {
        this.accessory.removeService(this.lightbulbLaserService);
      }
    }

    this.getStates();
  }

  getStates() {
    ['data', 'dp-refresh'].forEach((event) => {
      this.tuya.on(event, (data) => {
        Logger.debug(`Data received: ${JSON.stringify(data)}`);

        //power state
        if (data.dps[this.dps.powerState] !== undefined) {
          this.handlePowerState(data.dps[this.dps.powerState]);
        }

        //mode
        if (data.dps[this.dps.mode] !== undefined) {
          this.handleCurrentMode(data.dps[this.dps.mode]);
        }

        //laser brightness
        if (data.dps[this.dps.laserBrightness] !== undefined) {
          this.handleLaserBrightness(data.dps[this.dps.laserBrightness]);
        }

        //color
        if (data.dps[this.dps.color] !== undefined) {
          this.handleColor(data.dps[this.dps.color]);
        }

        //rotation
        if (data.dps[this.dps.rotation] !== undefined) {
          this.handleRotation(data.dps[this.dps.rotation]);
        }

        //laser state
        if (data.dps[this.dps.laserState] !== undefined) {
          this.handleLaserState(data.dps[this.dps.laserState]);
        }

        //color state
        if (data.dps[this.dps.colorState] !== undefined) {
          this.handleColorState(data.dps[this.dps.colorState]);
        }
      });
    });

    this.tuya.on('error', (error) => Logger.warn(error.message || error, this.accessory.displayName));

    this.tuya.on('disconnected', () => {
      Logger.warn('Disconnected', this.accessory.displayName);

      this.disconnected = true;
      this.lastState = this.switchService.getCharacteristic(this.api.hap.Characteristic.On).value;
      this.switchService.getCharacteristic(this.api.hap.Characteristic.On).updateValue(new Error('Not reachable!'));

      this.reconnect();
    });

    this.tuya.on('connected', () => {
      if (this.disconnected) {
        Logger.info('Connected', this.accessory.displayName);
        this.disconnected = false;
        this.switchService.getCharacteristic(this.api.hap.Characteristic.On).updateValue(this.lastState);
      }
    });

    //initial get
    this.tuya.get({ shema: true });
  }

  async reconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.disconnected) {
      try {
        await this.tuya.connect();
      } catch (err) {
        Logger.info(err.message || err, this.accessory.displayName);
        this.reconnectTimeout = setTimeout(this.reconnect.bind(this), 5000);
      }
    }
  }

  handleColor(value, fromScene) {
    if (this.lightbulbColorService) {
      Logger.debug(`Incoming color event: ${value} - From scene: ${fromScene}`);
      const color = ColorUtils.convertColorFromTuyaToHomeKit(value);

      this.lightbulbColorService.getCharacteristic(this.api.hap.Characteristic.Hue).updateValue(color.hue);
      this.lightbulbColorService
        .getCharacteristic(this.api.hap.Characteristic.Saturation)
        .updateValue(color.saturation);
      this.lightbulbColorService
        .getCharacteristic(this.api.hap.Characteristic.Brightness)
        .updateValue(color.brightness);
    }
  }

  handleColorState(state) {
    if (this.lightbulbColorService) {
      Logger.debug(`Incoming color state event: ${state}`);
      this.lightbulbColorService.getCharacteristic(this.api.hap.Characteristic.On).updateValue(state);
    }
  }

  handleCurrentMode(mode) {
    Logger.debug(`Incoming mode event: ${mode}`);
    this.currentMode = mode;
  }

  handleLaserBrightness(value) {
    if (this.lightbulbLaserService) {
      Logger.debug(`Incoming laser brightness event: ${value}`);

      value = value / 10;
      this.lightbulbLaserService.getCharacteristic(this.api.hap.Characteristic.Brightness).updateValue(value);
    }
  }

  handleLaserState(state) {
    if (this.lightbulbLaserService) {
      Logger.debug(`Incoming laser state event: ${state}`);
      this.lightbulbLaserService.getCharacteristic(this.api.hap.Characteristic.On).updateValue(state);
    }
  }

  handlePowerState(state) {
    Logger.debug(`Incoming power state event: ${state}`);
    this.switchService.getCharacteristic(this.api.hap.Characteristic.On).updateValue(state);

    if (this.fanService) {
      this.fanService.getCharacteristic(this.api.hap.Characteristic.Active).updateValue(state ? 1 : 0);
    }
  }

  handleRotation(value) {
    if (this.fanService) {
      Logger.debug(`Incoming rotation event: ${value}`);

      value = value / 10;
      this.fanService.getCharacteristic(this.api.hap.Characteristic.Active).updateValue(value > 1 ? 1 : 0);
      this.fanService.getCharacteristic(this.api.hap.Characteristic.RotationSpeed).updateValue(value);
    }
  }

  async setPowerState(state) {
    try {
      await this.tuya.set({
        dps: this.dps.powerState,
        set: state ? true : false,
      });

      Logger.info(`Power State: ${state}`, this.accessory.displayName);

      if (this.fanService) {
        this.fanService.getCharacteristic(this.api.hap.Characteristic.Active).updateValue(state ? 1 : 0);
      }
    } catch (err) {
      Logger.warn('An error occured during setting power state!', this.accessory.displayName);
      Logger.error(err);
    }
  }

  async setColorState(state) {
    try {
      await this.tuya.set({
        dps: this.dps.colorState,
        set: state ? true : false,
      });

      Logger.info(`Color State: ${state}`, this.accessory.displayName);
    } catch (err) {
      Logger.warn('An error occured during setting color state!', this.accessory.displayName);
      Logger.error(err);
    }
  }

  async setColor(value) {
    try {
      const color = ColorUtils.convertColorFromHomeKitToTuya(value);

      const data = {};
      data[this.dps.mode] = 'colour';
      data[this.dps.color] = color;

      await this.tuya.set({
        multiple: true,
        data: data,
      });

      Logger.info(`Color: ${JSON.stringify(value)}`, this.accessory.displayName);
    } catch (err) {
      Logger.warn('An error occured during setting new color!', this.accessory.displayName);
      Logger.error(err);
    }
  }

  async setLaserState(state) {
    try {
      await this.tuya.set({
        dps: this.dps.laserState,
        set: state ? true : false,
      });

      Logger.info(`Laser State: ${state}`, this.accessory.displayName);
    } catch (err) {
      Logger.warn('An error occured during setting laser state!', this.accessory.displayName);
      Logger.error(err);
    }
  }

  async setLaserBrightness(value) {
    try {
      await this.tuya.set({
        dps: this.dps.laserBrightness,
        set: value * 10,
      });

      Logger.info(`Laser Brightness: ${value}`, this.accessory.displayName);
    } catch (err) {
      Logger.warn('An error occured during setting laser brightness!', this.accessory.displayName);
      Logger.error(err);
    }
  }

  async setRotationSpeed(value) {
    try {
      await this.tuya.set({
        dps: this.dps.rotation,
        set: value * 10,
      });

      Logger.info(`Rotation Speed: ${value}`, this.accessory.displayName);

      if (value < 2) {
        this.fanService.getCharacteristic(this.api.hap.Characteristic.Active).updateValue(0);
      } else {
        this.fanService.getCharacteristic(this.api.hap.Characteristic.Active).updateValue(1);
      }
    } catch (err) {
      Logger.warn('An error occured during setting rotation speed!', this.accessory.displayName);
      Logger.error(err);
    }
  }
}

module.exports = ProjectorAccessory;
