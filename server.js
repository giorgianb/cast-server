"use strict";
const express = require("express");
const WebSocket = require("ws");
const youtubedl = require('youtube-dl');
const omxplayer = require('node-omxplayer');

const app = express();
const server = require('http').Server(app);
const wss = new WebSocket.Server({ server });

/* Error values */
const INVALID_PARAMETERS = { error: 101, message: "Command missing parameters." };
const EXPIRED_CAST = { error: 102, message: "Cast expired, video no longer playing." };
const UNKNOWN = { error: 1000, message: "Unknown error." };

var castClient;
const player = {
	process: null,
	playing: false
};

const CROSS_ORIGIN_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET",
	"Access-Control-Allow-Headers": "X-Requested-With"
};

function writeJSONResponse(res, JSONResponse) {
  // TODO: remove console.log in production
  console.log(JSON.stringify(JSONResponse));
	res.end(JSON.stringify(JSONResponse));
}

app.get("/cast", (req, res) => {
	if (!("video" in req.query)) {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, INVALID_PARAMETERS);
	}

	if (player.process && player.process.running) {
		player.process.quit();
		player.process = null;
	}

	const loadingScreen = omxplayer("loading_screen.mp4", "both", true);
	castClient = req.headers.host;
	youtubedl.getInfo(req.query.video, 
		["-format=bestvideo[ext!=webm]+bestaudio[ext!=webm]/best[ext!=webm]"], 
		(err, info) => {
			if (err) {
				res.writeHead(500, CROSS_ORIGIN_HEADERS);
				writeJSONResponse(res, UNKNOWN);
				throw err;
			}
			console.log(info.url);

			player.process = omxplayer(info.url, "both");
			loadingScreen.quit();

			player.playing = true;
		});

  res.writeHead(200, CROSS_ORIGIN_HEADERS);
  writeJSONResponse(res, { success: true });
});

app.get("/togglePause", (req, res) => {
	if (req.headers.host != castClient) {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, INVALID_PARAMETERS);
	} else if (player.process && player.process.running) { 
		if (player.playing) {
			player.process.pause();
			player.playing = false;
		} else {
			player.process.play();
			player.playing = true;
		}

		res.writeHead(200, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, { success: true });
	} else {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, EXPIRED_CAST);
	}
});

app.get("/skipForward", (req, res) => {
	if (req.headers.host != castClient) {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, INVALID_PARAMETERS);
	} else if (player.process && player.process.running) {
		player.process.fwd30();
		res.writeHead(200, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, { success: true });
	} else {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, EXPIRED_CAST);
	}
});

app.get("/skipBackwards", (req, res) => {
	if (req.headers.host != castClient) {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, INVALID_PARAMETERS);
	} else if (player.process && player.process.running) {
		player.process.back30();
		res.writeHead(200, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, { success: true });
	} else {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, EXPIRED_CAST);
	}
});

app.get("/volumeUp", (req, res) => {
	if (req.headers.host != castClient) {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, INVALID_PARAMETERS);
	} else if (player.process && player.process.running) {
		player.process.volUp();
		res.writeHead(200, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, { success: true });
	} else {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, EXPIRED_CAST);
	}
});

app.get("/volumeDown", (req, res) => {
	if (req.headers.host != castClient) {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, INVALID_PARAMETERS);
	} else if (player.process && player.process.running) {
		player.process.volDown();
		res.writeHead(200, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, { success: true });
	} else {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, EXPIRED_CAST);
	}
});

app.get("/isPlaying", (req, res) => {
		res.writeHead(200, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, { isPlaying: ((req.headers.host == castClient) ? player.playing 
      && player.process.running : false) });
});

app.get("/speedUp", (req, res) => {
	if (req.headers.host != castClient) {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, INVALID_PARAMETERS);
	} else if (player.process && player.process.running) {
		player.process.incSpeed();
		res.writeHead(200, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, { success: true });
	} else {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, EXPIRED_CAST);
	}
});

app.get("/slowDown", (req, res) => {
	if (req.headers.host != castClient) {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, INVALID_PARAMETERS);
	}  else if (player.process && player.process.running) {
		player.process.decSpeed();
		res.writeHead(200, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, { success: true });
	} else {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, EXPIRED_CAST);
	}
});

app.get("/subtitlesToggle", (req, res) => {
	if (req.headers.host != castClient) {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, INVALID_PARAMETERS);
	} else if (player.process && player.process.running) {
		player.process.subtitles();
		res.writeHead(200, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, { success: true });
	} else {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, EXPIRED_CAST);
	}
});

server.listen(8080, () => {
  console.log("Listening on %d", server.address().port);
});
