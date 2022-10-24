//this file contains the basic configuration for the server

const express = require("express");
const session = require("express-session");
const busboyBodyParser = require("busboy-body-parser");
const cookieParser = require("cookie-parser");
const flash = require("connect-flash");
const WebSocket = require("ws");
const NodeMediaServer = require("node-media-server");
const fs = require("fs");
const escape = require("escape-html");

const app = express();
const server = require("http").createServer(app);

require("dotenv").config();

const liveWss = new WebSocket.Server({noServer: true}); //transfer of live video
const chatWss = new WebSocket.Server({noServer: true}); //live chat
const obsWss = new WebSocket.Server({noServer: true}); //obs wss for ending obs streams

const nmsConfig = {
	rtmp: {
		port: 1935,
		chunk_size: 60000,
		gop_cache: true,
		ping: 30,
		ping_timeout: 60
	},
	http: {
		port: 8000,
		mediaroot: `${global.appRoot}/storage/videos/nmsMedia`,
		allow_origin: "*"
	},
	trans: {
		ffmpeg: '/usr/bin/ffmpeg',
		tasks: [
			{
				app: 'live',
				mp4: true,
				mp4Flags: '[movflags=frag_keyframe+empty_moov]',
				hls: true,
				hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]'
			}
		]
	}
};
const nms = new NodeMediaServer(nmsConfig);

const redisClient = require("./redisConfig");
const client = require("./dbConfig");
const middleware = require("./middleware");

app.set("view engine", require("ejs").renderFile);
app.use(express.urlencoded({ extended: false }));
app.use(session({
		secret: process.env.SALT,
		resave: false,
		saveUninitialized: false,
		expires: new Date(Date.now() + process.env.DAYS_EXPIRE * (24*60*60*1000))
	})
);
app.use(cookieParser());
app.use(flash());
app.use(express.json());
app.use(express.static('./views'));
app.use(express.static("./storage"));
app.use(busboyBodyParser());
app.use(middleware.checkNotAssigned);
//app.use(middleware.hitCounter);
//escape single quotes for psql to process, adding another single quote escapes it
app.use((req, res, next) => {
	for (var field in req.body) {
		req.body[field] = req.body[field].replace(/'/g, "\'\'");
	}

	next();
});

module.exports = {
	app,
	server,
	client,
	middleware,
	redisClient,
	liveWss,
	chatWss,
	obsWss,
	nms
}
