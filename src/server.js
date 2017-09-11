"use strict";
const http = require('http');
const url = require('url');
const child_process = require('child_process');
const crypto = require("crypto");

const NO_COMMAND = { error: 100, message: "No command specified." };
const INVALID_COMMAND = { error: 101, message: "No such command." };
const MISSING_PARAMETERS = { error: 102, message: "Command missing parameters." };

var castID;
var player;

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

	if (player) {
		player.kill();
		player = null;
	}

	//	castID = req.headers.host + ":" + query.video;
	const hash = crypto.createHash("md5");
	hash.update(query.video);

	castID = req.headers.host + ":" + hash.digest("hex");
	const command = "mpv '" + query.video + "' --title='" + castID + "'";
	player = child_process.exec(command, printChildProcessStream);
	res.writeHead(200, CROSS_ORIGIN_HEADERS);
	writeJSONResponse(res, { castID: castID });
}

function togglePause(req, res, query) {
	const keyPressCommandTemplate = "xdotool search '" + castID + "' windowactivate --sync key ";
	if (!("id" in query) || query.id != castID) {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, MISSING_PARAMETERS);
	}

	const keyPressCommand = keyPressCommandTemplate + "space";
	child_process.exec(keyPressCommand, printChildProcessStream);
	res.writeHead(200, CROSS_ORIGIN_HEADERS);
	writeJSONResponse(res, { success: true });
}

function skipForward(req, res, query) {
	const keyPressCommandTemplate = "xdotool search '" + castID + "' windowactivate --sync key ";
	if (!("id" in query) || query.id != castID) {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, MISSING_PARAMETERS);
	}

	const keyPressCommand = keyPressCommandTemplate + "Right";
	child_process.exec(keyPressCommand, printChildProcessStream);
	res.writeHead(200, CROSS_ORIGIN_HEADERS);
	writeJSONResponse(res, { success: true });
}

function skipBackwards(req, res, query) {
	const keyPressCommandTemplate = "xdotool search '" + castID + "' windowactivate --sync key ";
	if (!("id" in query) || query.id != castID) {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, MISSING_PARAMETERS);
	}

	const keyPressCommand = keyPressCommandTemplate + "Left";
	child_process.exec(keyPressCommand, printChildProcessStream);
	res.writeHead(200, CROSS_ORIGIN_HEADERS);
	writeJSONResponse(res, { success: true });
}

function volumeUp(req, res, query) {
	const keyPressCommandTemplate = "xdotool search '" + castID + "' windowactivate --sync key ";
	if (!("id" in query) || query.id != castID) {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, MISSING_PARAMETERS);
	}

	const keyPressCommand = keyPressCommandTemplate + "0";
	child_process.exec(keyPressCommand, printChildProcessStream);
	res.writeHead(200, CROSS_ORIGIN_HEADERS);
	writeJSONResponse(res, { success: true });
}

function volumeDown(req, res, query) {
	const keyPressCommandTemplate = "xdotool search '" + castID + "' windowactivate --sync key ";
	if (!("id" in query) || query.id != castID) {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, MISSING_PARAMETERS);
	}

	const keyPressCommand = keyPressCommandTemplate + "9";
	child_process.exec(keyPressCommand, printChildProcessStream);
	res.writeHead(200, CROSS_ORIGIN_HEADERS);
	writeJSONResponse(res, { success: true });
}

function speedUp(req, res, query) {
	const keyPressCommandTemplate = "xdotool search '" + castID + "' windowactivate --sync key ";
	if (!("id" in query) || query.id != castID) {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, MISSING_PARAMETERS);
	}

	const keyPressCommand = keyPressCommandTemplate + "bracketright";
	child_process.exec(keyPressCommand, printChildProcessStream);
	res.writeHead(200, CROSS_ORIGIN_HEADERS);
	writeJSONResponse(res, { success: true });
}

function slowDown(req, res, query) {
	const keyPressCommandTemplate = "xdotool search '" + castID + "' windowactivate --sync key ";
	if (!("id" in query) || query.id != castID) {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, MISSING_PARAMETERS);
	}

	const keyPressCommand = keyPressCommandTemplate + "bracketleft";
	child_process.exec(keyPressCommand, printChildProcessStream);
	res.writeHead(200, CROSS_ORIGIN_HEADERS);
	writeJSONResponse(res, { success: true });
}

function subtitlesToggle(req, res, query) {
	const keyPressCommandTemplate = "xdotool search '" + castID + "' windowactivate --sync key ";
	if (!("id" in query) || query.id != castID) {
		res.writeHead(400, CROSS_ORIGIN_HEADERS);
		writeJSONResponse(res, MISSING_PARAMETERS);
	}

	const keyPressCommand = keyPressCommandTemplate + "v";
	child_process.exec(keyPressCommand, printChildProcessStream);
	res.writeHead(200, CROSS_ORIGIN_HEADERS);
	writeJSONResponse(res, { success: true });
}
