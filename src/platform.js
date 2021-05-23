'use strict';

const Logger = require('./helper/logger.js');
const packageFile = require('../package.json');

const TuyAPI = require('tuyapi');

//Accessories
const ProjectorAccessory = require('./accessories/ProjectorAccessory');
const SceneAccessory = require('./accessories/SceneAccessory');

const PLUGIN_NAME = 'homebridge-star-projector';
const PLATFORM_NAME = 'StarProjector';

var Accessory, UUIDGen;

module.exports = function (homebridge) {
  Accessory = homebridge.platformAccessory;
  UUIDGen = homebridge.hap.uuid;

  return StarProjector;
};

function StarProjector(log, config, api) {
  if (!api || !config) return;

  Logger.init(log, config.debug);

  this.api = api;
  this.accessories = [];
  this.config = config;

  this.devices = new Map();
  this.projectors = new Map();

  if (this.config.projectors) {
    this.config.projectors.forEach((device) => {
      let error = false;

      if (!device.name) {
        Logger.warn('One of the devices has no name configured. This device will be skipped.');
        error = true;
      } else if (!device.tuyaId) {
        Logger.warn(
          'There is no Tuya ID / API Key configured for this device. This device will be skipped.',
          device.name
        );
        error = true;
      } else if (!device.tuyaKey) {
        Logger.warn(
          'There is no Tuya Key / API Secret configured for this device. This device will be skipped.',
          device.name
        );
        error = true;
      }

      if (!error) {
        const uuid = UUIDGen.generate(device.name);

        if (this.devices.has(uuid)) {
          Logger.warn('Multiple devices are configured with this name. Duplicate device will be skipped.', device.name);
        } else {
          device.type = 'light';

          device.dps = {
            powerState: 20,
            mode: 20,
            rotation: 20,
            scene: 25,
            colorState: 20,
            color: 20,
            laserState: 20,
            laserBrightness: 20,
            ...device.dps,
          };

          this.devices.set(uuid, device);

          if (device.scenes) {
            device.scenes.forEach((scene) => {
              error = false;
              let validColors = ['RED', 'GREEN', 'BLUE', 'ORANGE', 'YELLOW', 'PURPLE', 'CYAN'];
              scene.colors = scene.colors && scene.colors.length ? scene.colors : false;

              if (!scene.active) {
                Logger.info('Scene not active. This scene will be skipped.', device.name);
                error = true;
              } else if (!scene.name) {
                Logger.warn('One of the scenes has no name configured. This scene will be skipped.');
                error = true;
              } else if (!scene.colors || !scene.colors.every((color) => validColors.includes(color))) {
                Logger.warn('One of the scenes has no or not supported color. This scene will be skipped.');
                error = true;
              }

              if (!error) {
                const uuid2 = UUIDGen.generate(scene.name);

                if (this.devices.has(uuid2)) {
                  Logger.warn(
                    'Multiple devices are configured with this name. Duplicate device will be skipped.',
                    scene.name
                  );
                } else {
                  const validModes = ['FLASH', 'BREATH'];

                  scene.mode = validModes.includes(scene.mode) ? scene.mode : 'STATIC';
                  scene.rotation = scene.rotation > 0 && scene.rotation < 100 ? scene.rotation : 50;

                  const sceneDevice = {
                    ...scene,
                    dps: device.dps,
                    linkedTo: device.name,
                    type: 'scene',
                  };

                  this.devices.set(uuid2, sceneDevice);
                }
              }
            });
          }
        }
      }
    });
  }

  this.api.on('didFinishLaunching', this.connect.bind(this));
}

StarProjector.prototype = {
  connect: async function () {
    for (const entry of this.devices.entries()) {
      let device = entry[1];

      if (!device.linkedTo) {
        const tuya = new TuyAPI({
          id: device.tuyaId,
          key: device.tuyaKey,
        });

        try {
          await tuya.find();
          await tuya.connect();

          Logger.info('Connected to Tuya API', device.name);
        } catch (err) {
          Logger.warn('An error occured during connecting to Tuya API', device.name);
          Logger.error(err);
        }

        this.projectors.set(device.name, tuya);
      }
    }

    this.finishLaunching();
  },

  finishLaunching: function () {
    for (const entry of this.devices.entries()) {
      let uuid = entry[0];
      let device = entry[1];

      const cachedAccessory = this.accessories.find((curAcc) => curAcc.UUID === uuid);

      if (!cachedAccessory) {
        const accessory = new Accessory(device.name, uuid);

        Logger.info('Configuring accessory...', accessory.displayName);
        this.accessories.push(accessory);

        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }

    this.accessories.forEach((accessory) => {
      const device = this.devices.get(accessory.UUID);
      if (!device) {
        this.removeAccessory(accessory);
      } else {
        this.setupAccessory(accessory, device);
      }
    });
  },

  setupAccessory: async function (accessory, device) {
    accessory.on('identify', () => {
      Logger.info('Identify requested.', accessory.displayName);
    });

    const AccessoryInformation = accessory.getService(this.api.hap.Service.AccessoryInformation);

    const manufacturer = device.manufacturer && device.manufacturer !== '' ? device.manufacturer : 'Homebridge';
    const model = device.model && device.model !== '' ? device.model : 'Smart Projector';
    const serialNumber = device.serialNumber && device.serialNumber !== '' ? device.serialNumber : 'SerialNumber';

    if (AccessoryInformation) {
      AccessoryInformation.setCharacteristic(this.api.hap.Characteristic.Manufacturer, manufacturer);
      AccessoryInformation.setCharacteristic(this.api.hap.Characteristic.Model, model);
      AccessoryInformation.setCharacteristic(this.api.hap.Characteristic.SerialNumber, serialNumber);
      AccessoryInformation.setCharacteristic(this.api.hap.Characteristic.FirmwareRevision, packageFile.version);
    }

    accessory.context.config = device;
    const tuya = this.projectors.get(device.linkedTo || device.name);

    if (device.type === 'light') {
      new ProjectorAccessory(this.api, accessory, tuya);
    } else if (device.type === 'scene') {
      new SceneAccessory(this.api, accessory, tuya);
    }
  },

  configureAccessory: async function (accessory) {
    Logger.info('Configuring accessory...', accessory.displayName);
    this.accessories.push(accessory);
  },

  removeAccessory: function (accessory) {
    Logger.info('Removing accessory...', accessory.displayName);

    let accessories = this.accessories.map((cachedAccessory) => {
      if (cachedAccessory.displayName !== accessory.displayName) {
        return cachedAccessory;
      }
    });

    this.accessories = accessories.filter(function (el) {
      return el != null;
    });

    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
  },
};
