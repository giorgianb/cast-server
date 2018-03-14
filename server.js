"use strict";
const express = require("express");
const WebSocket = require("ws");
const youtubedl = require('youtube-dl');
const OMXPlayer = require('node-omxplayer-raspberry-pi-cast');
const spawn = require('child_process').spawn;
const ip = require('ip');

const WEBSOCKET_SERVER_PORT_LEGACY = 1337;
const WEBSOCKET_SERVER_PORT = 1338;
const HTTP_SERVER_PORT = 8080;

const VERSION = "STABLE_0.1.2"

const app = express();
const server = require('http').Server(app);

const wssLegacy = new WebSocket.Server({ port: WEBSOCKET_SERVER_PORT_LEGACY }, () => {
  console.log("WebSocket server listening on %d", WEBSOCKET_SERVER_PORT_LEGACY );
});

const wss = new WebSocket.Server({ port: WEBSOCKET_SERVER_PORT }, () => {
  console.log("WebSocket server listening on %d", WEBSOCKET_SERVER_PORT);
});

/* status values */
const SUCCESS = 0;
const INVALID_PARAMETERS = 101;
const EXPIRED_CAST = 102;
const NO_CAST = 103;
const CAST_LOADING = 104;
const NEW_CASTER = 105;

const UNKNOWN  = 1000;

const cast = {
  process: null,
  playing: false,
  loading: false,
  client: undefined,
  id: null
};

const wsClientsLegacy = [];
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

function getPlaybackStatus(host) {
  return isPlaying(host) ? "Playing" : "Paused";
}


function stateChange() {
  wsClientsLegacy.forEach((client) => {
    if (client.ws.readyState == WebSocket.OPEN)
      client.ws.send(JSON.stringify({ isPlaying: isPlaying(client.address) }));
  });

  wsClients.forEach((client) => {
    if (client.ws.readyState == WebSocket.OPEN)
      client.ws.send(JSON.stringify({ messageType: "playbackStatus", playbackStatus: getPlaybackStatus(client.address) }));
  });
}

function notifyClosed() {
  wsClients.forEach((client) => {
    if (client.ws.readyState == WebSocket.OPEN)
      client.ws.send(JSON.stringify({ messageType: "playbackStatus", playbackStatus: "Stopped" }));
  });
}

/* returns true of validation succeeded, false otherwise */
function validateRequest(req, res) {
  if (cast.loading) {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: CAST_LOADING });
    return false;
  }

  return validateRequestWeak(req, res);
}


/* this is a weaker version that doesn't check if the player is loading. This can be
 * useful for the quit functionality */
/* TODO: make quit use this function, and appropiately cancel a loading cast */
function validateRequestWeak(req, res) {
  if (!cast.process || !cast.process.ready) {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: NO_CAST });
    return false;
  } else if (!ip.isEqual(req.connection.remoteAddress, cast.client)) {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: NEW_CASTER });
    return false;
  } else if (!cast.process.running) {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: EXPIRED_CAST });
    return false;
  } 
  return true;
}

function isInt(value) {
  return !isNaN(value) && !isNaN(parseInt(value, 10));
}

function isFloat(value) {
  return !isNaN(value) && !isNaN(parseFloat(value, 10));
}

function castVideo(req, res) {
  if (!("video" in req.query)) {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: INVALID_PARAMETERS });
  }

  cast.playing = false;
  stateChange();
  notifyClosed();

  if (!cast.process || !cast.process.running)
    cast.process = new OMXPlayer({ source: "loading-screen.mp4", output: "both", loop: true, noOsd: true });
  else
    cast.process.newSource({ source: "loading-screen.mp4", output: "both", loop: true, noOsd: true });

  cast.loading = true;
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
        cast.process.quit();
        return;
      }

      clearScreen();
      cast.process.newSource({ source: info.url, output: "both" }, () => {
        cast.loading = false;
        if (currentCastID == cast.id) {
          cast.process.getDuration((err, duration) => {
            if (err) {
              res.writeHead(500, DEFAULT_HEADERS);
              writeJSONResponse(res, { status: UNKNOWN, version: VERSION });
            } else if (cast.id != currentCastID) {
              res.writeHead(400, DEFAULT_HEADERS);
              writeJSONResponse(res, { status: EXPIRED_CAST, version: VERSION });
            } else {
              cast.playing = true;
              stateChange();
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
        notifyClosed();
        printIPAddress();
        stateChange();
      });
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

app.post("/cast", castVideo);

app.get("/play", (req, res) => {
  if (validateRequest(req, res)) 
    cast.process.play((err) => {
      if (err) {
        res.writeHead(500, DEFAULT_HEADERS);
        writeJSONResponse(res, { status: UNKNOWN });
      } else {
        res.writeHead(200, DEFAULT_HEADERS);
        writeJSONResponse(res, { status: SUCCESS });

        cast.playing = true;
        stateChange();
      }
    });
});

app.get("/pause", (req, res) => {
  if (validateRequest(req, res))
    cast.process.pause((err) => {
      if (err) {
        res.writeHead(500, DEFAULT_HEADERS);
        writeJSONResponse(res, { status: UNKNOWN });
      } else {
        res.writeHead(200, DEFAULT_HEADERS);
        writeJSONResponse(res, { status: SUCCESS });

        cast.playing = false;
        stateChange();
      }
    });
});

app.get("/getPlaybackStatus", (req, res) => {
  if (cast.process && (!cast.process.ready || !cast.process.running)
   || req.connection.remoteAddress != cast.client || !cast.playing) {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: NO_CAST, playbackStatus: "Paused" });
  } else {
    cast.process.getPlaybackStatus((err, playbackStatus) => {
      if (err) {
        res.writeHead(500, DEFAULT_HEADERS)
        writeJSONResponse(res, { playbackStatus: "Paused", status: UNKNOWN });
      } else {
        res.writeHead(200, DEFAULT_HEADERS)
        writeJSONResponse(res, { playbackStatus: playbackStatus, status: SUCCESS });
      }
    });
  }
});

app.get("/getDuration", (req, res) => {
  if (validateRequest(req, res)) { 
    cast.process.getDuration((err, duration) => {
      if (!err) {
        res.writeHead(200, DEFAULT_HEADERS);
        writeJSONResponse(res, { duration: duration, status: SUCCESS });
      } else {
        res.writeHead(500, DEFAULT_HEADERS);
        writeJSONResponse(res, { status: UNKNOWN });
      }
    });
  }
});

app.get("/getPosition", (req, res) => {
  if (validateRequest(req, res)) { 
    cast.process.getPosition((err, pos) => {
      if (!err) {
        res.writeHead(200, DEFAULT_HEADERS);
        writeJSONResponse(res, { position: (pos < 0) ? 0 : pos, status: SUCCESS });
      } else {
        res.writeHead(500, DEFAULT_HEADERS);
        writeJSONResponse(res, { status: UNKNOWN });
      }
    });
  }
});

app.post("/setPosition", (req, res) => {
  if ("position" in req.query && isInt(req.query.position)) { 
    if (validateRequest(req, res)) {
      cast.process.setPosition(parseInt(req.query.position, 10), (err, pos) => {
        if (!err && pos) {
          res.writeHead(200, DEFAULT_HEADERS);
          writeJSONResponse(res, { position: (pos < 0) ? 0 : pos, status: SUCCESS });
        } else {
          res.writeHead(500, DEFAULT_HEADERS);
          writeJSONResponse(res, { status: UNKNOWN });
        }
      });
    }
  } else {
    res.writeHead(400, DEfAULT_HEADERS)
    writeJSONResponse(res, { status: INVALID_PARAMETERS });
  }
});

app.post("/quit", (req, res) => {
  if (validateRequest(req, res))
    cast.process.quit((err) => {
      if (err) {
        res.writeHead(500, DEFAULT_HEADERS);
        writeJSONResponse(res, { status: UNKNOWN });
      } else {
        res.writeHead(200, DEFAULT_HEADERS);
        writeJSONResponse(res, { status: SUCCESS });

      }

      cast.playing = false;
      stateChange();
      notifyClosed();
    });
});

app.post("/seek", (req, res) => {
  if ("offset" in req.query && isInt(req.query.offset)) { 
    if (validateRequest(req, res))
      cast.process.seek(parseInt(req.query.offset, 10), (err, offset) => {
        if (offset === null) {
          res.writeHead(400, DEFAULT_HEADERS);
          writeJSONResponse(res, { status: INVALID_PARAMETERS });
        } else if (err) {
          res.writeHead(500, DEFAULT_HEADERS);
          writeJSONResponse(res, { status: UNKNOWN });
        } else {
          res.writeHead(200, DEFAULT_HEADERS);
          writeJSONResponse(res, { status: SUCCESS });
        }
      });
  } else {
    res.writeHead(400, DEfAULT_HEADERS)
    writeJSONResponse(res, { status: INVALID_PARAMETERS });
  }
});

app.post("/increaseVolume", (req, res) => {
  if (validateRequest(req, res)) {
    cast.process.increaseVolume();
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  }
});

app.post("/decreaseVolume", (req, res) => {
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
        res.writeHead(500, DEFAULT_HEADERS);
        writeJSONResponse(res, { status: UNKNOWN });
      }
    });
  }
});

app.post("/setVolume", (req, res) => {
  if ("volume" in req.query && isFloat(req.query.volume)) { 
    if (validateRequest(req, res)) {
      cast.process.setVolume(parseFloat(req.query.volume, 10), (err, vol) => {
        if (!err && vol) {
          res.writeHead(200, DEFAULT_HEADERS);
          writeJSONResponse(res, { volume: vol, status: SUCCESS });
        } else {
          res.writeHead(500, DEFAULT_HEADERS);
          writeJSONResponse(res, { status: UNKNOWN });
        }
      });
    }
  } else {
    res.writeHead(400, DEfAULT_HEADERS)
    writeJSONResponse(res, { status: INVALID_PARAMETERS });
  }
});

app.post("/showSubtitles", (req, res) => {
  if (validateRequest(req, res)) {
    cast.process.showSubtitles();
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  }
});

app.post("/hideSubtitles", (req, res) => {
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

wssLegacy.on('connection', (ws, req) => {
  wsClientsLegacy.push({ ws: ws, address: req.connection.remoteAddress });

  ws.send(JSON.stringify({ isPlaying: isPlaying(req.connection.remoteAddress) }));
});

wss.on('connection', (ws, req) => {
  const client = { 
    ws: ws, 
    address: req.connection.remoteAddress
  };

  client.positionUpdater = setInterval(() => {
    
    if (cast.client !== undefined
      && ip.isEqual(client.address, cast.client) && cast.process
      && cast.process.ready && cast.process.running && cast.playing) {
      cast.process.getPosition((err, pos) => {
        if (!err) {
          if (client.ws.readyState !== WebSocket.OPEN)
            clearInterval(client.positionUpdater);
          else
            client.ws.send(JSON.stringify({ messageType: "position", position: pos }));
        }
      });
    }
  }, 500);

  wsClients.push(client);
  ws.send(JSON.stringify({ messageType: "playbackStatus", playbackStatus: getPlaybackStatus(req.connection.remoteAddress) }));
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
app.get("/cast", castVideo);

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

app.get("/isPlaying", (req, res) => {
 if (cast.process && !cast.process.ready) {
    res.writeHead(400, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: NO_CAST, isPlaying: false });
  } else  {
    res.writeHead(200, DEFAULT_HEADERS)
    writeJSONResponse(res, { isPlaying: isPlaying(req.connection.remoteAddress), status: SUCCESS });
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

app.post("/increaseSpeed", (req, res) => {
  if (validateRequest(req, res)) {
    cast.process.increaseSpeed();
    res.writeHead(200, DEFAULT_HEADERS);
    writeJSONResponse(res, { status: SUCCESS });
  }
});

app.post("/decreaseSpeed", (req, res) => {
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

app.get("/skipBackwards", (req, res) => {
  if (validateRequest(req, res)) {
    cast.process.seek(-30 * 10**6);
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
