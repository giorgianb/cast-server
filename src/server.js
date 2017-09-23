"use strict";
const http = require('http');
const url = require('url');
const crypto = require("crypto");
const youtubedl = require('youtube-dl');
const omxplayer = require('node-omxplayer');

const NO_COMMAND = { error: 100, message: "No command specified." };
const INVALID_COMMAND = { error: 101, message: "No such command." };
const MISSING_PARAMETERS = { error: 102, message: "Command missing parameters." };
const EXPIRED_ID = { error: 103, message: "ID expired, video no longer playing." };
const UNKNOWN = { error: 1000, message: "Unknown error." };

var castID;
var player = {
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
		default:
			res.writeHead(400, CROSS_ORIGIN_HEADERS);
			writeJSONResponse(res, INVALID_COMMAND);
			break;
	}
});
server.listen(8080);

function writeJSONResponse(res, JSONResponse) {
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
		writeResponse(res, MISSING_PARAMETERS);
	}

	if (player.process) {
		player.process.quit();
		player.process = null;
	}

	//	castID = req.headers.host + ":" + query.video;
	const hash = crypto.createHash("md5");
	hash.update(query.video);

	castID = req.headers.host + ":" + hash.digest("hex");
	youtubedl.getInfo(query.video, [], (err, info) => {
		if (err) {
			res.writeHead(500, CROSS_ORIGIN_HEADERS);
			writeResponse(res, UNKNOWN);
			throw err;
		}

		player.process = omx(info.url);
		player.playing = true;
		res.writeHead(200, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, { castID: castID });
	});
}

function togglePause(req, res, query) {
	if (!("id" in query) || query.id != castID) {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, MISSING_PARAMETERS);
	} else if (player.process) { 
		if (player.playing) {
			player.process.pause();
			player.playing = false;
		} else {
			player.process.play();
			player.process.playing = true;
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
		writeJSONResponse(res, MISSING_PARAMETERS);
	} else if (player.process) {
		player.fwd30();
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
		writeJSONResponse(res, MISSING_PARAMETERS);
	} else if (player.process) {
		player.back30();
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
		writeJSONResponse(res, MISSING_PARAMETERS);
	} else if (player.process) {
		player.volUp();
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
		writeJSONResponse(res, MISSING_PARAMETERS);
	} else if (player.process) {
		player.volDown();
		res.writeHead(200, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, { success: true });
	} else {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, EXPIRED_ID);
	}
}

function speedUp(req, res, query) {
	if (!("id" in query) || query.id != castID) {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, MISSING_PARAMETERS);
	} else if (player.process) {
		player.incSpeed();
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
		writeJSONResponse(res, MISSING_PARAMETERS);
	}  else if (player.process) {
		player.decSpeed();
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
		writeJSONResponse(res, MISSING_PARAMETERS);
	} else if (player.process) {
		player.subtitles();
		res.writeHead(200, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, { success: true });
	} else {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, EXPIRED_ID);
	}
}
