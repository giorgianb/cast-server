## Updating
Go to the directory where cast-server was installed:

```
cd cast-server/
git pull
sudo apt install -y figlet
npm install
```

If you have issues executing the said instructions, delete the directory and perform a fresh install:
```
rm -rf cast-server/
git clone https://gitlab.com/raspberry-pi-cast/cast-server
cd cast-server/
npm install
```

Then, see the [README](README.md) for instructions on how to run the server.
