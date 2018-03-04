# cast-server
Le serveur du logiciel cast, permettant de lire des vidéos d’un navigateur web à un Raspberry Pi.

Remarque : Node.js ne marchant plus sur les processeurs ARMv6 dans les nouvelles versions, un Raspberry 2 ou plus récent est nécessaire. Un rétroportage vers le Raspberry Pi original est prévu.

## Installation
Des instructions pour installer Raspbian sont disponibles sur [le site web de Raspberry Pi](https://www.raspberrypi.org/downloads/).

Une fois que Raspbian est installé et connecté à Internet, exécutez :
```
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt install nodejs git omxplayer figlet
git clone https://gitlab.com/raspberry-pi-cast/cast-server
cd cast-server
npm install
```

## Exécution
```
setterm -powersave off -blank 0
cd cast-server
node server.js
```

Pour lire des vidéos vers le Raspberry Pi, utilisez [l’extension cast](https://gitlab.com/raspberry-pi-cast/cast-addon-firefox).
