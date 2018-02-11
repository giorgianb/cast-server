"use strict";
const express = require("express");
const WebSocket = require("ws");
const youtubedl = require('youtube-dl');
const omxplayer = require('node-omxplayer');
const spawn = require('child_process').spawn;
const ip = require('ip');

const WEBSOCKET_SERVER_PORT = 1337;
const HTTP_SERVER_PORT = 8080;

const app = express();
const server = require('http').Server(app);
const wss = new WebSocket.Server({ port: WEBSOCKET_SERVER_PORT }, () => {
  console.log("WebSocket server listening on %d", WEBSOCKET_SERVER_PORT);
});

/* Error values */
const INVALID_PARAMETERS = { error: 101 };
const EXPIRED_CAST = { error: 102 };
const UNKNOWN = { error: 1000 };

var castClient;
const player = {
	process: null,
	playing: false
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
  return (castClient !== undefined && ip.isEqual(castClient, host)) ? player.playing && player.process.running : false;
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
		writeJSONResponse(res, INVALID_PARAMETERS);
	}

	if (player.process && player.process.running) {
		player.process.quit();
		player.process = null;
	}

	player.process = omxplayer("loading-screen.mp4", "both", true);
	castClient = req.connection.remoteAddress;
	youtubedl.getInfo(req.query.video, 
		["-format=bestvideo[ext!=webm]+bestaudio[ext!=webm]/best[ext!=webm]"], 
		(err, info) => {
			if (err) {
				res.writeHead(500, DEFAULT_HEADERS);
				writeJSONResponse(res, UNKNOWN);
				throw err;
			}

      clearScreen();
			player.process.newSource(info.url, "both");
      player.process.on("close", () => {
        player.playing = false;
        printIPAddress();
        stateChange();
      });

			player.playing = true;
      stateChange();
		});

  res.writeHead(200, DEFAULT_HEADERS);
  writeJSONResponse(res, { success: true });
});

app.get("/togglePause", (req, res) => {
	if (req.connection.remoteAddress != castClient) {
		res.writeHead(400, DEFAULT_HEADERS);
		writeJSONResponse(res, INVALID_PARAMETERS);
	} else if (player.process && player.process.running) { 
		if (player.playing) {
			player.process.pause();
			player.playing = false;
      stateChange();
		} else {
			player.process.play();
			player.playing = true;
      stateChange();
		}

		res.writeHead(200, DEFAULT_HEADERS);
		writeJSONResponse(res, { success: true });
	} else {
		res.writeHead(400, DEFAULT_HEADERS);
		writeJSONResponse(res, EXPIRED_CAST);
	}
});

app.get("/skipForward", (req, res) => {
	if (req.connection.remoteAddress != castClient) {
		res.writeHead(400, DEFAULT_HEADERS);
		writeJSONResponse(res, INVALID_PARAMETERS);
	} else if (player.process && player.process.running) {
		player.process.fwd30();
		res.writeHead(200, DEFAULT_HEADERS);
		writeJSONResponse(res, { success: true });
	} else {
		res.writeHead(400, DEFAULT_HEADERS);
		writeJSONResponse(res, EXPIRED_CAST);
	}
});

app.get("/skipBackwards", (req, res) => {
	if (req.connection.remoteAddress != castClient) {
		res.writeHead(400, DEFAULT_HEADERS);
		writeJSONResponse(res, INVALID_PARAMETERS);
	} else if (player.process && player.process.running) {
		player.process.back30();
		res.writeHead(200, DEFAULT_HEADERS);
		writeJSONResponse(res, { success: true });
	} else {
		res.writeHead(400, DEFAULT_HEADERS);
		writeJSONResponse(res, EXPIRED_CAST);
	}
});

app.get("/volumeUp", (req, res) => {
	if (req.connection.remoteAddress != castClient) {
		res.writeHead(400, DEFAULT_HEADERS);
		writeJSONResponse(res, INVALID_PARAMETERS);
	} else if (player.process && player.process.running) {
		player.process.volUp();
		res.writeHead(200, DEFAULT_HEADERS);
		writeJSONResponse(res, { success: true });
	} else {
		res.writeHead(400, DEFAULT_HEADERS);
		writeJSONResponse(res, EXPIRED_CAST);
	}
});

app.get("/volumeDown", (req, res) => {
	if (req.connection.remoteAddress != castClient) {
		res.writeHead(400, DEFAULT_HEADERS);
		writeJSONResponse(res, INVALID_PARAMETERS);
	} else if (player.process && player.process.running) {
		player.process.volDown();
		res.writeHead(200, DEFAULT_HEADERS);
		writeJSONResponse(res, { success: true });
	} else {
		res.writeHead(400, DEFAULT_HEADERS);
		writeJSONResponse(res, EXPIRED_CAST);
	}
});

app.get("/isPlaying", (req, res) => {
		res.writeHead(200, DEFAULT_HEADERS);
		writeJSONResponse(res, { isPlaying: isPlaying(req.connection.remoteAddress) });
});

app.get("/speedUp", (req, res) => {
	if (req.connection.remoteAddress != castClient) {
		res.writeHead(400, DEFAULT_HEADERS);
		writeJSONResponse(res, INVALID_PARAMETERS);
	} else if (player.process && player.process.running) {
		player.process.incSpeed();
		res.writeHead(200, DEFAULT_HEADERS);
		writeJSONResponse(res, { success: true });
	} else {
		res.writeHead(400, DEFAULT_HEADERS);
		writeJSONResponse(res, EXPIRED_CAST);
	}
});

app.get("/slowDown", (req, res) => {
	if (req.connection.remoteAddress != castClient) {
		res.writeHead(400, DEFAULT_HEADERS);
		writeJSONResponse(res, INVALID_PARAMETERS);
	}  else if (player.process && player.process.running) {
		player.process.decSpeed();
		res.writeHead(200, DEFAULT_HEADERS);
		writeJSONResponse(res, { success: true });
	} else {
		res.writeHead(400, DEFAULT_HEADERS);
		writeJSONResponse(res, EXPIRED_CAST);
	}
});

app.get("/toggleSubtitles", (req, res) => {
	if (req.connection.remoteAddress != castClient) {
		res.writeHead(400, DEFAULT_HEADERS);
		writeJSONResponse(res, INVALID_PARAMETERS);
	} else if (player.process && player.process.running) {
		player.process.subtitles();
		res.writeHead(200, DEFAULT_HEADERS);
		writeJSONResponse(res, { success: true });
	} else {
		res.writeHead(400, DEFAULT_HEADERS);
		writeJSONResponse(res, EXPIRED_CAST);
	}
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
