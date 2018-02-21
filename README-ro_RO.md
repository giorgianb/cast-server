# cast-server
Server-ul pentru software-ul cast, care permite utilizatorului să ruleze video-uri de la un navigator web pe un Raspberry Pi.

Advertisment: Datorit faptului că varientele mai noi de Node.js nu mai rulează pe procesoarele de ARMv6, este nevoie de un Raspberry Pi 2 sau mai nou. În viitor software-ul va fi modificat pentru a putea rula si pe Raspberry Pi 1.

## Instalare
Vedeți [site-ul de Raspberry Pi](https://www.raspberrypi.org/downloads/) pentru instrucțiunile de a instala Raspbian.

De îndată ce Raspbian este instalat și conectat la internet, să rulați aceste comenzi:
```
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt install nodejs git omxplayer figlet
git clone https://gitlab.com/raspberry-pi-cast/cast-server
cd cast-server
npm install
```

## Rulare 
```
setterm -powersave off -blank 0
cd cast-server
node server.js
```

Pentru a rula video-uri de la un navigator web pe un Raspberry Pi, aveți nevoie de
[addon-ul cast](https://gitlab.com/raspberry-pi-cast/cast-addon-firefox).


