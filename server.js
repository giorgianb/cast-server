"use strict";
const http = require('http');
const url = require('url');
const crypto = require("crypto");
const youtubedl = require('youtube-dl');
const omxplayer = require('node-omxplayer');

const NO_COMMAND = { error: 100, message: "No command specified." };
const INVALID_COMMAND = { error: 101, message: "No such command." };
const INVALID_PARAMETERS = { error: 102, message: "Command missing parameters." };
const EXPIRED_ID = { error: 103, message: "ID expired, video no longer playing." };
const UNKNOWN = { error: 1000, message: "Unknown error." };

var castID;
const player = {
	process: null,
	playing: false
};


const CROSS_ORIGIN_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET",
	"Access-Control-Allow-Headers": "X-Requested-With"
};

var server = http.createServer(function(req, res) {
	const query = url.parse(req.url, true).query;
	if (!("command" in query)) {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, NO_COMMAND);
	}

  // TODO: remove in production console.log
	console.log(query.command);
		
	switch (query.command) {
		case "cast":
			cast(req, res, query);
			break;
		case "togglePause":
			togglePause(req, res, query);
			break;
		case "skipForward":
			skipForward(req, res, query);
			break;
		case "skipBackwards":
			skipBackwards(req, res, query);
			break;
		case "volumeUp":
			volumeUp(req, res, query);
			break;
		case "volumeDown":
			volumeDown(req, res, query);
			break;
		case "speedUp":
			speedUp(req, res, query);
			break;
		case "slowDown":
			slowDown(req, res, query);
			break;
		case "subtitlesToggle":
			subtitlesToggle(req, res, query);
			break;
    case "isPlaying":
      isPlaying(req, res, query);
      break;
		default:
			res.writeHead(400, CROSS_ORIGIN_HEADERS);
			writeJSONResponse(res, INVALID_COMMAND);
			break;
	}
});
server.listen(8080);

function writeJSONResponse(res, JSONResponse) {
  // TODO: remove console.log in production
  console.log(JSON.stringify(JSONResponse));
	res.end(JSON.stringify(JSONResponse));
}

function printChildProcessStream(error, stdout, stderr) {
	console.log(error);
	console.log(stdout);
	console.log(stderr);
}

function cast(req, res, query) {
	if (!("video" in query)) {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, INVALID_PARAMETERS);
	}

	if (player.process) {
		player.process.quit();
		player.process = null;
	}

	const hash = crypto.createHash("md5");
	hash.update(query.video + new Date().getTime());

	var loadingScreen = omxplayer("loading_screen.mp4", "both", true);
	castID = req.headers.host + ":" + hash.digest("hex");
	youtubedl.getInfo(query.video, ["-format=bestvideo[ext!=webm]+bestaudio[ext!=webm]/best[ext!=webm]"], (err, info) => {
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
  writeJSONResponse(res, { castID: castID });
}

function togglePause(req, res, query) {
	if (!("id" in query) || query.id != castID) {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, INVALID_PARAMETERS);
	} else if (player.process) { 
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
		writeJSONResponse(res, EXPIRED_ID);
	}
}

function skipForward(req, res, query) {
	if (!("id" in query) || query.id != castID) {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, INVALID_PARAMETERS);
	} else if (player.process) {
		player.process.fwd30();
		res.writeHead(200, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, { success: true });
	} else {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, EXPIRED_ID);
	}
}

function skipBackwards(req, res, query) {
	if (!("id" in query) || query.id != castID) {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, INVALID_PARAMETERS);
	} else if (player.process) {
		player.process.back30();
		res.writeHead(200, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, { success: true });
	} else {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, EXPIRED_ID);
	}
}

function volumeUp(req, res, query) {
	if (!("id" in query) || query.id != castID) {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, INVALID_PARAMETERS);
	} else if (player.process) {
		player.process.volUp();
		res.writeHead(200, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, { success: true });
	} else {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, EXPIRED_ID);
	}
}

function volumeDown(req, res, query) {
	if (!("id" in query) || query.id != castID) {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, INVALID_PARAMETERS);
	} else if (player.process) {
		player.process.volDown();
		res.writeHead(200, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, { success: true });
	} else {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, EXPIRED_ID);
	}
}

function isPlaying(req, res, query) {
	if (!("id" in query)) {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, INVALID_PARAMETERS);
	} else {
		res.writeHead(200, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, { isPlaying: ((query.id == castID) ? player.playing : false) });
  }
}

function speedUp(req, res, query) {
	if (!("id" in query) || query.id != castID) {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, INVALID_PARAMETERS);
	} else if (player.process) {
		player.process.incSpeed();
		res.writeHead(200, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, { success: true });
	} else {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, EXPIRED_ID);
	}
}

function slowDown(req, res, query) {
	if (!("id" in query) || query.id != castID) {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, INVALID_PARAMETERS);
	}  else if (player.process) {
		player.process.decSpeed();
		res.writeHead(200, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, { success: true });
	} else {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, EXPIRED_ID);
	}
}

function subtitlesToggle(req, res, query) {
	if (!("id" in query) || query.id != castID) {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, INVALID_PARAMETERS);
	} else if (player.process) {
		player.process.subtitles();
		res.writeHead(200, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, { success: true });
	} else {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, EXPIRED_ID);
	}
}
