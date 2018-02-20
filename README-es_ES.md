# cast-server
El software de servidor para el software cast, cual permite al usario reproducir videos desde su navigador web a un Raspberry Pi.

Aviso: Porque los variantes mas nuevos de Node.js nu funcionan con los procesadores de ARMv6, se necesita al menos un Raspberry Pi 2. En el futuro el software será modificado para que funcione con el Raspberry Pi 1.

## Instalar
Ven [el sitio web de Raspberry Pi](https://www.raspberrypi.org/downloads/) para instrucciones de como instalar Raspbian.

En cuanto se instaló Raspbian y el sistema está conectado a la red, ejecutan estos comandos:
```
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt install nodejs git omxplayer figlet
git clone https://gitlab.com/raspberry-pi-cast/cast-server
cd cast-server
npm install
```

## Ejecutar
```
cd cast-server
node server.js
```

Para reproducir el video desde un navigador web a un Raspberry Pi, se necesita
[el addon cast](https://gitlab.com/raspberry-pi-cast/cast-addon-firefox).
