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

	console.log("PROTOCOL UPGRADE");

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
	//get the query parameter in the connecting url
	var queryparams = url.parse(req.url, true).query;

	//isolate the websocket with the livestream id in the url query parameters
	var streams = Array.from(liveWss.clients).filter((socket) => {
		return typeof socket.streamid != 'undefined';
	}).filter((socket) => {
		return socket.streamid == queryparams.streamid;
	});

	//close the socket if there are no live streams and if this is a client and not an streamer
	if (streams.length <= 0 && queryparams.isClient == 'true') {
		ws.close();
	} else if (streams.length > 0 && queryparams.isClient == 'true') {
		//set the room to the stream id
		ws.room = queryparams.streamid;

		//send the data buffer to the client
		var dataBuf = Buffer.concat(streams[0].dataBuffer);
		ws.send(dataBuf);
	} else if (streams.length <= 0 && queryparams.isStreamer == 'true') { //if the connecting client is a streamer, then do stuff
		//set the streamid
		ws.streamid = queryparams.streamid;

		//get the value that enables the chat
		var enablechat = await client.query(`SELECT enablechat FROM videos WHERE id=$1`, [queryparams.streamid]);
		enablechat = enablechat.rows[0].enablechat;

		//add a value which denotes the enabling of chatting in the chatrooms
		ws.enableChat = enablechat;

		//create a data buffer array to create a video buffer to load the full video into the client side if they join late
		ws.dataBuffer = [];

		//get the stream from the database
		var stream = await client.query(`SELECT * FROM videos WHERE id=$1`, [queryparams.streamid]);
		stream = stream.rows[0];

		//create a file stream for saving the contents of the live stream
		var fileName = "./storage/videos/files/" + Date.now() + "-" + stream.title + ".webm";
		var writeStream = fs.createWriteStream(fileName);

		console.log("BEGIN WRITING TO FILE FOR WEB STREAM");

		//set the video path equal to the path to the webm
		var videopath = fileName.replace("./storage", "");

		//set the video path in the database entry
		await client.query(`UPDATE videos SET video=$1 WHERE id=$2`, [videopath, queryparams.streamid]);

		//set the video path in the videofiles table
		await client.query(`UPDATE videofiles SET video=$1 WHERE id=$2`, [videopath, queryparams.streamid]);

		//message that we got a connection from the streamer
		console.log("Connection from Streamer.");
	}

	//event handling for socket messages
	ws.on("message", (message) => {
		if (queryparams.isStreamer == 'true') {
			if (typeof message == 'object') {
				//write the new data to the file
				writeStream.write(message, () => {
					console.log("Writing to file complete.");
				});

				//append the data to the data buffer
				ws.dataBuffer.push(message);
			}

			//sort the clients for the websocket server to only the stream
			//viewers
			var clients = Array.from(liveWss.clients).filter((socket) => {
				return socket.room == stream.id;
			}).filter((socket) => {
				return socket.readyState == WebSocket.OPEN;
			});

			//send the new data to each of the corresponding clients
			clients.forEach((item, index) => {
				item.send(message);
			});
		} else if (queryparams.isClient == 'true') {
			if (message == "ended") {
				console.log(`Stream with id: ${queryparams.streamid} ended.`);
			}
		}
	});

	//event handling for a closing/disconnecting socket
	ws.on("close", async () => {
		if (queryparams.isStreamer == 'true') {
			console.log("Streamer Disconnected.");
			writeStream.end();
			writeStream.on("finish", () => {
				console.log("Finished writing to file");
			});
			await client.query(`UPDATE videos SET streaming=$1 WHERE id=$2`, ['false', stream.id]);
			await client.query(`UPDATE users SET videocount=videocount+1 WHERE id=$1`, [stream.user_id]);
		} else if (queryparams.isClient == 'true') {
			console.log("Stream Viewer Disconnected.");
		}
	});
});

//this is a websocket connection handler for the obs server which handles the ending of OBS streams
obsWss.on("connection", async (ws, req) => {
	//get the user info from the cookies in the headers
	var sessionid = cookie.parse(req.headers.cookie).sessionid;

	var userinfo = await middleware.getUserSession(sessionid);

	//get the query parameters of the connecting url
	var queryparams = url.parse(req.url, true).query;

	ws.room = queryparams.streamid;

	ws.on("message", async (message) => {
		if (message == "ended") {
			console.log("OBS STREAM ENDED:", ws.room);
			await client.query(`UPDATE users SET videocount=videocount+1 WHERE id=$1`, [userinfo.id]);
		}
	});
});

//this is a websocket connection handler for the chat server which handles the transmitting of chat data between clients of a live stream
chatWss.on("connection", async (ws, req) => {
	//get the user info from the cookies in the headers
	var sessionid = cookie.parse(req.headers.cookie).sessionid;

	var userinfo = await middleware.getUserSession(sessionid);

	//get the query parameters of the connecting user
	var queryparams = url.parse(req.url, true).query;

	//set the room id of this socket
	ws.room = queryparams.streamid;

	//whenever we get a message
	ws.on("message", async (message) => {
		//get the streamid and the actual message
		var data = message.split(",");

		if (data[0] == "msg") { //if the data is a message to send, then send it
			//get the recipients from the chat wss for this live stream
			var recipients = Array.from(chatWss.clients).filter((socket) => {
				return typeof socket.room != 'undefined';
			}).filter((socket) => {
				return socket.room == queryparams.streamid;
			});

			//send the message to each of the recipients
			recipients.forEach((item, index) => {
				var chatmessage = userinfo.channelicon + "," + userinfo.username + "," + data[1];
				if (item != ws) {
					//create a string containing the channel icon and the username of the one who sent this message
					console.log("CHAT MESSAGE:", chatmessage);
					item.send(chatmessage);
				}
			});

			//insert the message into the database along with the stream id, user id, and the time which the message was posted
			await client.query(`INSERT INTO livechat (message, stream_id, user_id, time) VALUES ($1, $2, $3, $4)`, [data[1], queryparams.streamid, userinfo.id, parseInt(data[2], 10)]);
		}
	});
});
