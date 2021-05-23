<p align="center">
    <img src="https://github.com/SeydX/homebridge-star-projector/blob/master/images/logo.png" height="200">
</p>


# homebridge-star-projector

[![npm](https://img.shields.io/npm/v/homebridge-star-projector.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-star-projector)
[![npm](https://img.shields.io/npm/dt/homebridge-star-projector.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-star-projector)
[![GitHub last commit](https://img.shields.io/github/last-commit/SeydX/homebridge-star-projector.svg?style=flat-square)](https://github.com/SeydX/homebridge-star-projector)
[![Donate](https://img.shields.io/badge/Donate-PayPal-blue.svg?style=flat-square&maxAge=2592000)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=NP4T3KASWQLD8)

**Creating and maintaining Homebridge plugins consume a lot of time and effort, if you would like to share your appreciation, feel free to "Star" or donate.**

[Click here](https://github.com/SeydX) to review more of my plugins.

## Info

<img src="https://github.com/SeydX/homebridge-star-projector/blob/master/images/demo.gif" align="right" alt="HomeKit Demo" width="270px">

This is a dynamic platform plugin for [Homebridge](https://github.com/nfarina/homebridge) to control **Tuya / Smart Life** based star projectors.

This Plugin creates a grouped Accessory (`Switch`, `Lightbulbs` and `Fan`) and it allows to customize the state, color, laser and star rotation of the star projector. You can also create scenes which expose Switches to HomeKit to enable your own configured scenes.

## Tested Projectors

This plugin is verified to work with following Star Projectors:

https://www.amazon.de/dp/B08VGK1V82

## Installation instructions

After [Homebridge](https://github.com/nfarina/homebridge) has been installed:

-  ```sudo npm i -g homebridge-star-projector@latest```


## Basic configuration

 ```
{
  "bridge": {
    ...
  },
  "accessories": [
    ...
  ],
  "platforms": [
    {
      "platform": "StarProjector",
      "name": "StarProjector",
      "debug": false,
      "projectors": [
          {
              "name": "Star Projector",
              "tuyaId": "asdsadsafasvasfsfs",
              "tuyaKey": "12w31231ascasdqasd"
          }
        }
      ]
    }
  ]
}
 ```
 See [Example Config](https://github.com/SeydX/homebridge-star-projector/blob/master/example-config.json) for more details.


## Credentials

In order to use the plugin, you need to find out your "Tuya ID / API Key" and your "Tuya Key / API Secret". [Here](https://github.com/codetheweb/tuyapi/blob/master/docs/SETUP.md#listing-tuya-devices-from-the-tuya-smart-or-smart-life-apps) is a great tutorial how you can generate your credentials.

Once you have your credentials, you just have to add it to your config.json, thats it.


## Endpoints / DPS

This plugin uses the great [TuyApi](https://github.com/codetheweb/tuyapi) module. If you have problems switching the state, changing color, changing rotation etc., you can change the "endpoints" manually via [config.json](https://github.com/SeydX/homebridge-star-projector/blob/master/example-config.json).

These "endpoints" are also called `dps`. The plugin uses the following (default) endpoints/dps:

* 20  = Power State (true/false)
* 21  = Mode ('white', 'color', 'scene')
* 22  = Laser Brightness (10 - 1000)
* 24  = Color (HSB)
* 25  = Scene
* 26  = Countdown (Seconds) (currently not implemented)
* 101 = Star Rotation Speed (10 - 1000)
* 102 = Laser State (true/false)
* 103 = Color State (true/false)


## Supported clients

This plugin has been verified to work with the following apps on iOS 14:

* iOS 14+
* Apple Home
* All 3rd party apps like Elgato Eve etc.
* Homebridge v1.1.6+


## Contributing

You can contribute to this homebridge plugin in following ways:

- [Report issues](https://github.com/SeydX/homebridge-star-projector/issues) and help verify fixes as they are checked in.
- Review the [source code changes](https://github.com/SeydX/homebridge-star-projector/pulls).
- Contribute bug fixes.
- Contribute changes to extend the capabilities

Pull requests are accepted.


## Troubleshooting

If you have any issues with the plugin then you can run this plugin in debug mode, which will provide some additional information. This might be useful for debugging issues. Just enable ``debug`` in your config and restart homebridge.


## Disclaimer

All product and company names are trademarks™ or registered® trademarks of their respective holders. Use of them does not imply any affiliation with or endorsement by them.