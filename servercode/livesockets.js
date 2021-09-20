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
			var indexOfSocket = global.webWssClients.findIndex((item) => {
				return JSON.stringify(item) == JSON.stringify(ws);
			});
			global.webWssClients[queryparams.streamid].splice(indexOfSocket, 1);
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
			var indexOfSocket = global.obsWssClients.findIndex((item) => {
				return JSON.stringify(item) == JSON.stringify(ws);
			});
			global.obsWssClients[queryparams.streamid].splice(indexOfSocket, 1);
		}
	});
});

//this is a websocket connection handler for the chat server which handles the transmitting of chat data between clients of a live stream
chatWss.on("connection", async (ws, req) => {
	//get the user session and query parameters
	var sessionid = cookie.parse(req.headers.cookie).sessionid;
	var userinfo = await middleware.getUserSession(sessionid);
	var queryparams = url.parse(req.url, true).query;

	//check for the existence of a live chat entry
	if (typeof global.chatWssClients[queryparams.streamid] == 'undefined') {
		//add a live chat entry which contains the clients and a queue of messages
		global.chatWssClients[queryparams.streamid] = {queue: [], clients: [ws]};
	} else {
		//add this user to the chat clients and send them the queued messages of the chat
		global.chatWssClients[queryparams.streamid].clients.push(ws);
		for (var message of global.chatWssClients[queryparams.streamid].queue.slice(-50)) {
			ws.send(JSON.stringify(message));
		}
	}

	ws.on("message", async (message) => {
		var data = JSON.parse(message);

		//check to see if this is a live chat message
		if (data.message) {
			//get the other clients of this live chat
			var recipients = global.chatWssClients[queryparams.streamid].clients.filter((socket) => {
				return socket.readyState == WebSocket.OPEN && JSON.stringify(socket) != JSON.stringify(ws);
			});

			//send the chat message information to other live chat clients and add the message to the queue
			var chatmessage = {userid: userinfo.id, username: userinfo.username, channelicon: userinfo.channelicon, message: data.message};
			global.chatWssClients[queryparams.streamid].queue.push(chatmessage);
			recipients.forEach((item, index) => {
				item.send(JSON.stringify(chatmessage));
			});


			//push the live chat message into the database
			var msgValues = [data.message, queryparams.streamid, userinfo.id, data.time];
			msgValues = msgValues.map((item) => {
				if (typeof item == "string") {
					return "\'" + item + "\'";
				} else {
					return item;
				}
			});
			client.query(`INSERT INTO livechat (message, stream_id, user_id, time) VALUES (${msgValues})`);
		}
	});

	ws.on("close", async (message) => {
		//remove the client from the live chat entry
		var indexOfSocket = global.chatWssClients[queryparams.streamid].clients.findIndex((item) => {
			return JSON.stringify(item) == JSON.stringify(ws);
		});
		global.chatWssClients[queryparams.streamid].clients.splice(indexOfSocket, 1);

		//delete the entire live chat entry if the above removal left no people in the live chat
		if (!global.chatWssClients[queryparams.streamid].clients.length) {
			delete global.chatWssClients[queryparams.streamid];
		}
	});
});
