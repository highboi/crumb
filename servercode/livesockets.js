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

	//get the stream entry in the global object
	var wsEntry = global.webWssClients[queryparams.streamid];

	//close the socket if there are no live streams and if this is a client and not an streamer
	//(no stream is being started, only connected to)
	if (typeof wsEntry == 'undefined' && queryparams.isClient == 'true') {
		ws.close();
	} else if (typeof wsEntry != 'undefined' && queryparams.isClient == 'true') { //if the client is connecting to a valid stream
		//set the room to the stream id
		ws.room = queryparams.streamid;

		//add this client to the global object entry
		global.webWssClients[queryparams.streamid].push(ws);

		//send the data buffer to the client
		var dataBuf = Buffer.concat(wsEntry[0].dataBuffer);
		ws.send(dataBuf);
	} else if (typeof wsEntry == 'undefined' && queryparams.isStreamer == 'true') { //if the connecting client is a streamer, then do stuff
		//set the streamid
		ws.streamid = queryparams.streamid;

		//get the value that enables the chat
		var enablechat = await client.query(`SELECT enablechat FROM videos WHERE id=$1`, [queryparams.streamid]);
		enablechat = enablechat.rows[0].enablechat;

		//add a value which denotes the enabling of chatting in the chatrooms
		ws.enableChat = enablechat;

		//create a data buffer array to create a video buffer to load the full video into the client side if they join late
		ws.dataBuffer = [];

		//create a new object entry in the global variable and add the streamer as the first element in the array
		global.webWssClients[queryparams.streamid] = [ws];

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
		if (queryparams.isStreamer == 'true') { //if the socket is from a streamer, then do stuff
			if (typeof message == 'object') {
				//write the new data to the file
				writeStream.write(message, () => {
					console.log("Writing to file complete.");
				});

				//append the data to the data buffer
				ws.dataBuffer.push(message);
			}

			//get all of the open clients in the global object
			var clients = global.webWssClients[queryparams.streamid].slice(1).filter((socket) => {
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
		//filter for streamers vs clients
		if (queryparams.isStreamer == 'true') { //if a streamer
			console.log("Streamer Disconnected.");

			//end the writing to the video file
			writeStream.end();
			writeStream.on("finish", () => {
				console.log("Finished writing to file");
			});

			//delete the websocket entry in the global variable
			delete global.webWssClients[queryparams.streamid];

			//set the "streaming" field in the videos table to "false" and increase the video count for the streamer
			await client.query(`UPDATE videos SET streaming=$1 WHERE id=$2`, ['false', queryparams.streamid]);
			await client.query(`UPDATE users SET videocount=videocount+1 WHERE id=$1`, [stream.user_id]);
		} else if (queryparams.isClient == 'true') { //if a client
			//remove this websocket client from the global object entry
			global.webWssClients[queryparams.streamid].splice(global.webWssClients[queryparams.streamid].indexOf(ws), 1);

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
	//get the session id cookie value from the headers
	var sessionid = cookie.parse(req.headers.cookie).sessionid;

	//get the user info based on the session id cookie value
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
