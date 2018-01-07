# cast-server
The server for the cast software, which allows videos to be cast from a web browser to a Raspberry Pi.

## Installation
See the [Raspberry Pi Website](https://www.raspberrypi.org/downloads/) for instructions on how to install Raspbian.

Once Raspbian in installed and connect to the internet, run:
```
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo aptinstall nodejs git omxplayer
git clone https://gitlab.com/raspberry-pi-cast/cast-server
cd cast-server
npm install
```

To run, do:
```
cd cast-server
node server.js
```

Now, to cast videos to your Raspberry Pi, please use the 
[cast add-on](https://gitlab.com/raspberry-pi-cast/cast-addon-firefox).
