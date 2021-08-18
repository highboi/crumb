const {server, liveWss, obsWss, chatWss, middleware, client} = require("./configBasic");
const cookie = require("cookie");
const url = require("url");
const fs = require("fs");
const WebSocket = require("ws");

/*
WEBSOCKET HANDLING FOR LIVE STREAMING
*/

//handle the http upgrade for websockets (switching from http(s) to ws protocol)
server.on("upgrade", (req, socket, head) => {
	var pathname = url.parse(req.url).pathname;

	switch (pathname) {
		case "/live": case "/live/":
			console.log("Live Streaming Server Connection...");
			liveWss.handleUpgrade(req, socket, head, (ws) => {
				liveWss.emit("connection", ws, req);
			});
			break;
		case "/chat": case "/chat/":
			console.log("Chat Server Connection...");
			chatWss.handleUpgrade(req, socket, head, (ws) => {
				chatWss.emit("connection", ws, req);
			});
			break;
		case "/obslive": case "/obslive/":
			console.log("OBS Live Streaming Server Connection...");
			obsWss.handleUpgrade(req, socket, head, (ws) => {
				obsWss.emit("connection", ws, req);
			});
			break;
		default:
			console.log("Attempted upgrade at " + pathname);
			break;
	}
});

//this is the websocket connection handler for the websocket live streaming server
liveWss.on("connection", async (ws, req) => {
	var queryparams = url.parse(req.url, true).query;

	var wsEntry = global.webWssClients[queryparams.streamid];

	if (typeof wsEntry != 'undefined' && queryparams.isClient == 'true') { //if the client is connecting to a valid stream
		global.webWssClients[queryparams.streamid].push(ws);

		var dataBuf = Buffer.concat(wsEntry[0].dataBuffer);
		ws.send(dataBuf);
	} else if (typeof wsEntry == 'undefined' && queryparams.isStreamer == 'true') { //if client is a streamer wanting to start a stream
		var enablechat = await client.query(`SELECT enablechat FROM videos WHERE id=$1 LIMIT 1`, [queryparams.streamid]);
		enablechat = enablechat.rows[0].enablechat;

		ws.enableChat = enablechat;

		ws.dataBuffer = [];

		global.webWssClients[queryparams.streamid] = [ws];

		var stream = await client.query(`SELECT * FROM videos WHERE id=$1 LIMIT 1`, [queryparams.streamid]);
		stream = stream.rows[0];

		var fileName = "./storage/videos/files/" + Date.now() + "-" + stream.title + ".webm";
		var writeStream = fs.createWriteStream(fileName);

		var videopath = fileName.replace("./storage", "");

		await client.query(`UPDATE videos SET video=$1 WHERE id=$2`, [videopath, queryparams.streamid]);
		await client.query(`UPDATE videofiles SET video=$1 WHERE id=$2`, [videopath, queryparams.streamid]);
	} else { //if this is a client connecting to a non-existent stream
		ws.close();
	}

	ws.on("message", (message) => {
		if (queryparams.isStreamer == 'true') {
			if (typeof message == 'object') {
				writeStream.write(message, () => {
					console.log("Writing to file complete.");
				});

				ws.dataBuffer.push(message);
			}

			var clients = global.webWssClients[queryparams.streamid].slice(1).filter((socket) => {
				return socket.readyState == WebSocket.OPEN;
			});

			clients.forEach((item, index) => {
				item.send(message);
			});
		}
	});

	ws.on("close", async () => {
		if (queryparams.isStreamer == 'true') {
			writeStream.end();
			writeStream.on("finish", () => {
				console.log("Finished writing to file");
			});

			delete global.webWssClients[queryparams.streamid];

			await client.query(`UPDATE videos SET streaming=$1 WHERE id=$2`, ['false', queryparams.streamid]);
			await client.query(`UPDATE users SET videocount=videocount+1 WHERE id=$1`, [stream.user_id]);
		} else if (queryparams.isClient == 'true') {
			global.webWssClients[queryparams.streamid].splice(global.webWssClients[queryparams.streamid].indexOf(ws), 1);
		}
	});
});

//this is a websocket connection handler for the obs server which handles the ending of OBS streams
obsWss.on("connection", async (ws, req) => {
	var queryparams = url.parse(req.url, true).query;

	var wsEntry = global.obsWssClients[queryparams.streamid];

	if (typeof wsEntry == 'undefined' && queryparams.isStreamer == "true") {
		global.obsWssClients[queryparams.streamid] = [ws];
	} else if (typeof wsEntry != 'undefined' && queryparams.isClient == "true") {
		global.obsWssClients[queryparams.streamid].push(ws);
	} else {
		ws.close();
	}

	ws.on("close", async (message) => {
		if (queryparams.isStreamer == "true") {
			delete global.obsWssClients[queryparams.streamid];
		} else if (queryparams.isClient == "true") {
			global.obsWssClients[queryparams.streamid].splice(global.obsWssClients[queryparams.streamid].indexOf(ws), 1);
		}
	});
});

//this is a websocket connection handler for the chat server which handles the transmitting of chat data between clients of a live stream
chatWss.on("connection", async (ws, req) => {
	var sessionid = cookie.parse(req.headers.cookie).sessionid;

	var userinfo = await middleware.getUserSession(sessionid);

	var queryparams = url.parse(req.url, true).query;

	if (typeof global.chatWssClients[queryparams.streamid] == 'undefined') {
		global.chatWssClients[queryparams.streamid] = [ws];
	} else {
		global.chatWssClients[queryparams.streamid].push(ws);
	}

	ws.on("message", async (message) => {
		var data = message.split(",");

		if (data[0] == "msg") {
			var recipients = global.chatWssClients[queryparams.streamid].filter((socket) => {
				return socket.readyState == WebSocket.OPEN;
			});

			var chatmessage = userinfo.id + "," + userinfo.username + "," + userinfo.channelicon + "," + data[1]
			recipients.forEach((item, index) => {
				if (item != ws) {
					item.send(chatmessage);
				}
			});

			var msgValues = [data[1], queryparams.streamid, userinfo.id, parseInt(data[2], 10)];
			msgValues = msgValues.map((item) => {
				if (typeof item == "string") {
					return "\'" + item + "\'";
				} else {
					return item;
				}
			});
			await client.query(`INSERT INTO livechat (message, stream_id, user_id, time) VALUES (${msgValues})`);
		}
	});
});
