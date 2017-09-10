"use strict";
const http = require('http');
const url = require('url');
const child_process = require('child_process');

const NO_COMMAND = "100";
const INVALID_COMMAND = "101";

var castID;
var player;

var server = http.createServer(function(req, res) {
	res.writeHead(200);
	const query = url.parse(req.url, true).query;
	if ("video" in query) {
		const video = query.video;
		if (player) {
			player.kill();
			player = null;
		}

		castID = req.headers.host + ":"+ query.video;
		const command = "mpv '" + query.video + "' --title='" + castID + "'";
		player =  child_process.exec(command, function() {});
		res.end(castID);
	} else if ("id" in query && query.id == castID) {
		const command = query.command;
		if (!command) {
			res.end(NO_COMMAND);
			return;
		}

		const keyPressCommandTemplate = "xdotool search '" + castID + "' windowactivate --sync key ";
		var keyPressCommand = null;
		switch (command) {
			case "togglePause":
				keyPressCommand = keyPressCommandTemplate + "space";
				break;
			case "skipForward":
				keyPressCommand = keyPressCommandTemplate + "Right";
				break;
			case "skipBackwards":
				keyPressCommand = keyPressCommandTemplate + "Left";
				break;
			case "volumeUp":
				keyPressCommand = keyPressCommandTemplate + "0";
				break;
			case "volumeDown":
				keyPressCommand = keyPressCommandTemplate + "9";
				break;
			case "speedUp":
				keyPressCommand = keyPressCommandTemplate + "bracketright";
				break;
			case "slowDown":
				keyPressCommand = keyPressCommandTemplate + "bracketLeft";
				break;
			case "subtitlesCycle":
				keyPressCommand = keyPressCommandTemplate + "j";
				break;
			case "subtitlesUp":
				keyPressCommand = keyPressCommandTemplate + "r";
				break;
			case "subtitlesDown":
				keyPressCommand = keyPressCommandTemplate + "t";
				break;
			case "subtitlesToggle":
				keyPressCommand = keyPressCommandTemplate + "v";
				break;

		}
		if (!keyPressCommand)
			res.end(INVALID_COMMAND);
	 	child_process.exec(keyPressCommand, function() {});

		res.end("Success");
	}


});
server.listen(8080);
