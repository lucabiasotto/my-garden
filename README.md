# myGarden
Raspberry Pi and NodeJS controlled irrigation system.
The system has a main electric hydraulic valve valve to open the irrigation system and 7 electric hydraulic valve to control the 7 zones of the system.

![Alt text](images/mockup.jpg?raw=true "Scheme")

## Features
* Manual irrigation
* Automatic and configurable irrigation
* Scheduled irrigation
* Not irrigate if it rains
* Log event on Raspberry Micro SD

## Hardwware
* Raspberry Pi Zero W (wireless) & Zero Essentials Kit
** https://amzn.to/2UuUUwq
* Relay low level trigger
** https://amzn.to/2Rxr3S3
* Cables
** https://amzn.to/2UxRWal
* 8 Solenoid valve


## Conectione scheme
![Alt text](images/schema.jpg?raw=true "Scheme")
Note: the Relay is low level trigger, so the relay board is activated via software through GPIO11.


## Raspberry initial setup
* Download lite version of Raspbian
* Use Fetcher to write the ISO image on the SD Card
* Create 2 file on the SSD root:
** "ssh" an empty file called , this will enable the ssh
** “wpa_supplicant.conf” use this file to setup the Wi-Fi
```
country=it
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1

network={
ssid="ssid name"
psk=" wifi password"
}

```

## Install NodeJS and setup the rasp location
* Connect in ssh to the rasp and configure it
```
$ sudo cp /usr/share/zoneinfo/Europe/Rome /etc/localtime
$ cd /tmp
$ curl -o node-v9.9.0-linux-armv6l.tar.gz https://nodejs.org/dist/v9.9.0/node-v9.9.0-linux-armv6l.tar.gz
$ tar -xzf node-v9.9.0-linux-armv6l.tar.gz 
$ sudo cp -r node-v9.7.1-linux-armv6l/* /usr/local/
$ node -v
$ npm -v
```

## Copy myGarden project on the rasp
This is a sample of copy command, replace the path with your path

```
scp myGarden_path/* pi@192.168.1.102:/tmp/

move the project where you prefer

```
## Add Weather information
Open class weatherUtils.js and replace this information:

```
var API_KEY = "YOUR_KEY";
var API_KEY_NAME = "YOUR_API_NAME";
var LATTITUDE = "00.00000"
var LONGITUDE = "00.00000";
```

## Build the project on the raps
```
$ cd myGarden_project_path
$ npm uninstall sqlite3
$ npm cache clean
$ sudo rm /opt/myGarden/node_modules/
$ mkdir node_modules
$ sudo apt-get install libsqlite3-dev
$ npm install sqlite3 --build-from-source --sqlite=/usr
$ node install
```

## Create a startup service
Create a new service `$sudo nano /lib/systemd/system/mygarden.service`

```
[Unit]
Description=MyGarden service
After=network.target

[Service]
Environment=DATA_PATH=/home/pi/mygarden_data
Type=simple
User=pi
ExecStart=/usr/local/bin/node /opt/myGarden/bin/www.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Reload the daemon `$sudo systemctl daemon-reload`

### Stop o Start the process

```
$sudo systemctl start mygarden
$sudo systemctl status mygarden
$sudo systemctl stop mygarden
```

