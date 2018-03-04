"use strict";
const express = require("express");
const WebSocket = require("ws");
const youtubedl = require('youtube-dl');
const OMXPlayer = require('node-omxplayer-raspberry-pi-cast');
const spawn = require('child_process').spawn;
const ip = require('ip');

const WEBSOCKET_SERVER_PORT = 1337;
const HTTP_SERVER_PORT = 8080;

const VERSION = "0.11.0"

const app = express();
const server = require('http').Server(app);
const wss = new WebSocket.Server({ port: WEBSOCKET_SERVER_PORT }, () => {
  console.log("WebSocket server listening on %d", WEBSOCKET_SERVER_PORT);
});

/* status values */
const SUCCESS = 0;
const INVALID_PARAMETERS = 101;
const EXPIRED_CAST = 102;
const NO_CAST = 103;
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

/* returns true of validation succeeded, false otherwise */
function validateRequest(req, res) {
  if (!cast.process || !cast.process.ready) {
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: NO_CAST });
    return false;
  } else if (req.connection.remoteAddress != cast.client) {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: INVALID_PARAMETERS });
    return false;
  } else if (!cast.process.running) {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: EXPIRED_CAST });
    return false;
  }
  return true;
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
    cast.process = new OMXPlayer({ source: "loading-screen.mp4", output: "both", loop: true, noOsd: true });
  else
    cast.process.newSource({ source: "loading-screen.mp4", output: "both", loop: true });

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
      cast.process.newSource({ source: info.url, output: "both" }, () => {
        if (currentCastID == cast.id) {
          cast.process.getDuration((err, duration) => {
            if (err) {
              res.writeHead(400, DEFAULT_HEADERS);
              writeJSONResponse(res, { status: UNKNOWN, version: VERSION });
            } else if (cast.id != currentCastID) {
              res.writeHead(400, DEFAULT_HEADERS);
              writeJSONResponse(res, { status: EXPIRED_CAST, version: VERSION });
            } else {
              res.writeHead(200, DEFAULT_HEADERS);
              writeJSONResponse(res, { duration: duration, status: SUCCESS, version: VERSION });
            }
          });
        } else {
          res.writeHead(400, DEFAULT_HEADERS);
          writeJSONResponse(res, { status: EXPIRED_CAST, version: VERSION });
        }
      });

      cast.process.on("close", () => {
        cast.playing = false;
        printIPAddress();
        stateChange();
      });

      cast.playing = true;
      stateChange();
    });
});

app.get("/play", (req, res) => {
  if (validateRequest(req, res)) {
    cast.process.play();
    cast.playing = true;
    stateChange();

    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  } 
});

app.get("/pause", (req, res) => {
  if (validateRequest(req, res)) { 
    cast.process.pause();
    cast.playing = false;
    stateChange();

    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  } 
});

app.get("/getPosition", (req, res) => {
  if (validateRequest(req, res)) { 
    cast.process.getPosition((err, pos) => {
      if (!err) {
        res.writeHead(200, DEFAULT_HEADERS);
        writeJSONResponse(res, { position: (pos < 0) ? 0 : pos, status: SUCCESS });
      } else {
        res.writeHead(400, DEFAULT_HEADERS);
        writeJSONResponse(res, { status: UNKNOWN });
      }
    });
  }
});

app.post("/setPosition", (req, res) => {
  if ("position" in req.query) { 
    if (validateRequest(req, res)) {
      cast.process.setPosition(req.query.position, (err, pos) => {
        if (!err && pos) {
          res.writeHead(200, DEFAULT_HEADERS);
          writeJSONResponse(res, { position: (pos < 0) ? 0 : pos, status: SUCCESS });
        } else {
          res.writeHead(400, DEFAULT_HEADERS);
          writeJSONResponse(res, { status: UNKNOWN });
        }
      });
    }
  } else {
    res.writeHead(400, DEfAULT_HEADERS)
    writeJSONResponse(res, { status: INVALID_PARAMETERS });
  }
});

app.get("/quit", (req, res) => {
  if (validateRequest(req, res)) { 
    cast.process.quit();
    cast.playing = false;
    stateChange();

    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  }
});

app.get("/skipForward", (req, res) => {
  if (validateRequest(req, res)) {
    cast.process.seek(30 * 10**6);
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  }
});

app.get("/skipBackwards", (req, res) => {
  if (validateRequest(req, res)) {
    cast.process.seek(-30 * 10**6);
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  }
});

app.get("/increaseVolume", (req, res) => {
  if (validateRequest(req, res)) {
    cast.process.increaseVolume();
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  }
});

app.get("/decreaseVolume", (req, res) => {
  if (validateRequest(req, res)) {
    cast.process.decreaseVolume();
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  }
});

app.get("/getVolume", (req, res) => {
  if (validateRequest(req, res)) { 
    cast.process.getVolume((err, vol) => {
      if (!err) {
        res.writeHead(200, DEFAULT_HEADERS);
        writeJSONResponse(res, { volume: vol, status: SUCCESS });
      } else {
        res.writeHead(400, DEFAULT_HEADERS);
        writeJSONResponse(res, { status: UNKNOWN });
      }
    });
  }
});

app.post("/setVolume", (req, res) => {
  if ("volume" in req.query) { 
    if (validateRequest(req, res)) {
      cast.process.setPosition(req.query.volume, (err, vol) => {
        if (!err && pos) {
          res.writeHead(200, DEFAULT_HEADERS);
          writeJSONResponse(res, { volume: vol, status: SUCCESS });
        } else {
          res.writeHead(400, DEFAULT_HEADERS);
          writeJSONResponse(res, { status: UNKNOWN });
        }
      });
    }
  } else {
    res.writeHead(400, DEfAULT_HEADERS)
    writeJSONResponse(res, { status: INVALID_PARAMETERS });
  }
});

app.get("/isPlaying", (req, res) => {
 if (cast.process && !cast.process.ready) {
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: NO_CAST, isPlaying: false });
  } else  {
    res.writeHead(200, DEFAULT_HEADERS)
    writeJSONResponse(res, { isPlaying: isPlaying(req.connection.remoteAddress), status: SUCCESS });
  }
});

app.get("/increaseSpeed", (req, res) => {
  if (validateRequest(req, res)) {
    cast.process.increaseSpeed();
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  }
});

app.get("/decreaseSpeed", (req, res) => {
  if (validateRequest(req, res)) {
    cast.process.decreaseSpeed();
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  }
});

app.get("/showSubtitles", (req, res) => {
  if (validateRequest(req, res)) {
    cast.process.showSubtitles();
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  }
});

app.get("/hideSubtitles", (req, res) => {
  if (validateRequest(req, res)) {
    cast.process.hideSubtitles();
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
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
  if (validateRequest(req, res)) {
    cast.process.increaseVolume();
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  }
});

app.get("/volumeDown", (req, res) => {
  if (validateRequest(req, res)) {
    cast.process.decreaseVolume();
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  }
});

app.get("/togglePause", (req, res) => {
  if (validateRequest(req, res)) { 
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
  }
});
