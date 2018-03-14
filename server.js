"use strict";
const express = require("express");
const WebSocket = require("ws");
const youtubedl = require('youtube-dl');
const OMXPlayer = require('node-omxplayer-raspberry-pi-cast');
const spawn = require('child_process').spawn;
const ip = require('ip');

const WEBSOCKET_SERVER_PORT = 1337;
const HTTP_SERVER_PORT = 8080;

const VERSION = "STABLE_0.1.1"

const app = express();
const server = require('http').Server(app);
const wss = new WebSocket.Server({ port: WEBSOCKET_SERVER_PORT }, () => {
  console.log("WebSocket server listening on %d", WEBSOCKET_SERVER_PORT);
});

/* status values */
const SUCCESS = 0;
const INVALID_PARAMETERS = 101;
const EXPIRED_CAST = 102;
const UNKNOWN  = 1000;

const cast = {
  process: null,
  playing: false,
  client: undefined,
  id: null
};

const wsClients = [];

const DEFAULT_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET",
  "Access-Control-Allow-Headers": "X-Requested-With",
  "content-type": "application/json"
};

function writeJSONResponse(res, JSONResponse) {
  res.end(JSON.stringify(JSONResponse));
}

function isPlaying(host) {
  return (cast.client !== undefined && ip.isEqual(cast.client, host)) ? cast.playing && cast.process.running : false;
}

function stateChange() {
  wsClients.forEach((client) => {
    if (client.ws.readyState == WebSocket.OPEN)
      client.ws.send(JSON.stringify({ isPlaying: isPlaying(client.address) }));
  });
}

function printIPAddress() {
  clearScreen();
  let newLineCount = 0; 
  const figlet = spawn(
    "figlet", 
    ["-w",  process.stdout.columns, "-c",  'Cast IP Address\n' + ip.address().replace(/\./g, ' . ')]
  );

  figlet.stdout.on('data', (data) => {
    console.log(`${data}`);
    newLineCount += (String(data).match(/\n/g) || []).length;

  });

  figlet.on("close", () => {
    const lines = (process.stdout.rows - newLineCount) / 4;
    for (let i = 0; i < lines; ++i)
      console.log('\n');
  });
}

function clearScreen() {
  console.log('\u001B[2J');
}

app.get("/cast", (req, res) => {
  if (!("video" in req.query)) {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: INVALID_PARAMETERS });
  }

  if (!cast.process || !cast.process.running)
    cast.process = new OMXPlayer("loading-screen.mp4", "both", true);
  else
    cast.process.newSource("loading-screen.mp4", "both", true);

  cast.client = req.connection.remoteAddress;
  cast.id = (new Date()) + Math.random();
  let currentCastID = cast.id;
  youtubedl.getInfo(req.query.video, 
    ["-format=bestvideo[ext!=webm]+bestaudio[ext!=webm]/best[ext!=webm]"], 
    (err, info) => {
      /* make sure no new casts have been made while we were fetching the video URL */
      if (currentCastID != cast.id)
        return;
      else if (err) {
        res.writeHead(500, DEFAULT_HEADERS);
        writeJSONResponse(res, { status: UNKNOWN });
        throw err;
      }

      clearScreen();
      cast.process.newSource(info.url, "both");
      cast.process.on("close", () => {
        cast.playing = false;
        printIPAddress();
        stateChange();
      });

      cast.playing = true;
      stateChange();
    });

  res.writeHead(200, DEFAULT_HEADERS);
  writeJSONResponse(res, { status: SUCCESS });
});

app.get("/play", (req, res) => {
  if (cast.process && !cast.process.ready) {
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  } else if (req.connection.remoteAddress != cast.client) {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: INVALID_PARAMETERS });
  } else if (cast.process && cast.process.running) { 
    cast.process.play();
    cast.playing = true;
    stateChange();

    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  } else {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: EXPIRED_CAST });
  }
});

app.get("/pause", (req, res) => {
  if (cast.process && !cast.process.ready) {
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  } else if (req.connection.remoteAddress != cast.client) {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: INVALID_PARAMETERS });
  } else if (cast.process && cast.process.running) { 
    cast.process.pause();
    cast.playing = false;
    stateChange();

    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  } else {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: EXPIRED_CAST });
  }
});

app.get("/quit", (req, res) => {
  if (cast.process && !cast.process.ready) {
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  } else if (req.connection.remoteAddress != cast.client) {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: INVALID_PARAMETERS });
  } else if (cast.process && cast.process.running) { 
    cast.process.quit();
    cast.playing = false;
    stateChange();

    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  } else {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: EXPIRED_CAST });
  }
});

app.get("/skipForward", (req, res) => {
 if (cast.process && !cast.process.ready) {
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  } else if (req.connection.remoteAddress != cast.client) {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: INVALID_PARAMETERS });
  } else if (cast.process && cast.process.running) {
    cast.process.seek(30 * 10**6);
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  } else {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: EXPIRED_CAST });
  }
});

app.get("/skipBackwards", (req, res) => {
 if (cast.process && !cast.process.ready) {
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  } else if (req.connection.remoteAddress != cast.client) {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: INVALID_PARAMETERS });
  } else if (cast.process && cast.process.running) {
    cast.process.seek(-30 * 10**6);
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  } else {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: EXPIRED_CAST });
  }
});

app.get("/increaseVolume", (req, res) => {
 if (cast.process && !cast.process.ready) {
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  } else if (req.connection.remoteAddress != cast.client) {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: INVALID_PARAMETERS });
  } else if (cast.process && cast.process.running) {
    cast.process.increaseVolume();
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  } else {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: EXPIRED_CAST });
  }
});

app.get("/decreaseVolume", (req, res) => {
 if (cast.process && !cast.process.ready) {
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  } else if (req.connection.remoteAddress != cast.client) {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: INVALID_PARAMETERS });
  } else if (cast.process && cast.process.running) {
    cast.process.decreaseVolume();
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  } else {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: EXPIRED_CAST });
  }
});

app.get("/isPlaying", (req, res) => {
 if (cast.process && !cast.process.ready) {
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS, isPlaying: false });
  } else  {
    res.writeHead(200, DEFAULT_HEADERS)
    writeJSONResponse(res, { isPlaying: isPlaying(req.connection.remoteAddress) });
  }
});

app.get("/increaseSpeed", (req, res) => {
 if (cast.process && !cast.process.ready) {
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  } else if (req.connection.remoteAddress != cast.client) {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: INVALID_PARAMETERS });
  } else if (cast.process && cast.process.running) {
    cast.process.increaseSpeed();
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  } else {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: EXPIRED_CAST });
  }
});

app.get("/decreaseSpeed", (req, res) => {
 if (cast.process && !cast.process.ready) {
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  } else if (req.connection.remoteAddress != cast.client) {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: INVALID_PARAMETERS });
  }  else if (cast.process && cast.process.running) {
    cast.process.decreaseSpeed();
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  } else {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: EXPIRED_CAST });
  }
});

app.get("/showSubtitles", (req, res) => {
 if (cast.process && !cast.process.ready) {
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  } else if (req.connection.remoteAddress != cast.client) {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: INVALID_PARAMETERS });
  } else if (cast.process && cast.process.running) {
    cast.process.showSubtitles();
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  } else {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: EXPIRED_CAST });
  }
});

app.get("/hideSubtitles", (req, res) => {
 if (cast.process && !cast.process.ready) {
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  } else if (req.connection.remoteAddress != cast.client) {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: INVALID_PARAMETERS });
  } else if (cast.process && cast.process.running) {
    cast.process.hideSubtitles();
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  } else {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: EXPIRED_CAST });
  }
});

app.get("/getVersion", (req, res) => {
  res.writeHead(400, DEFAULT_HEADERS);
  writeJSONResponse(res, { status: success, version: VESRSION });
});

wss.on('connection', (ws, req) => {
  wsClients.push({ ws: ws, address: req.connection.remoteAddress });

  ws.send(JSON.stringify({ isPlaying: isPlaying(req.connection.remoteAddress) }));
});

server.listen(HTTP_SERVER_PORT, () => {
  console.log("HTTP server listening on %d", server.address().port);
  spawn(
    "setterm",
    ["-powersave", "off", "-blank", "0"]
  );
  printIPAddress();
});


/* Deprecated Functionality */
app.get("/volumeUp", (req, res) => {
 if (cast.process && !cast.process.ready) {
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  } else if (req.connection.remoteAddress != cast.client) {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: INVALID_PARAMETERS });
  } else if (cast.process && cast.process.running) {
    cast.process.increaseVolume();
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  } else {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: EXPIRED_CAST });
  }
});

app.get("/volumeDown", (req, res) => {
 if (cast.process && !cast.process.ready) {
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  } else if (req.connection.remoteAddress != cast.client) {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: INVALID_PARAMETERS });
  } else if (cast.process && cast.process.running) {
    cast.process.decreaseVolume();
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  } else {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: EXPIRED_CAST });
  }
});

app.get("/togglePause", (req, res) => {
  if (cast.process && !cast.process.ready) {
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  } else if (req.connection.remoteAddress != cast.client) {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: INVALID_PARAMETERS });
  } else if (cast.process && cast.process.running) { 
    if (cast.playing) {
      cast.process.pause();
      cast.playing = false;
      stateChange();
    } else {
      cast.process.play();
      cast.playing = true;
      stateChange();
    }

    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  } else {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: EXPIRED_CAST });
  }
});
