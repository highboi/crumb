//this file contains the basic configuration for the server

//modules to use
const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const flash = require("connect-flash");
const WebSocket = require("ws");
const NodeMediaServer = require("node-media-server");

//generate the express app
const app = express();

//make a server variable
const server = require("http").createServer(app);

//make websocket servers pertaining to specific functions
const liveWss = new WebSocket.Server({noServer: true});
const chatWss = new WebSocket.Server({noServer: true});

//configure and run node-media-server for OBS streaming on top of in-browser streams
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
		mediaroot: "./storage/videos/nmsMedia",
		allow_origin: "*"
	},
	trans: {
		ffmpeg: '/usr/bin/ffmpeg',
		tasks: [
			{
				app: 'live',
				mp4: true,
				mp4Flags: '[movflags=frag_keyframe+empty_moov]',
			}
		]
	}
};
const nms = new NodeMediaServer(nmsConfig);


//get the database client to make queries
const client = require("./dbConfig");

//get access to custom middleware functions and functions to make the code better
const middleware = require("./middleware");

//get the port for the server to listen on
const PORT = 80;

//the salt value for encrypting session data
const SALT = "superawesomesecretsaltime";

//set up the rendering engine for the views
app.set("view engine", "ejs");

//allow the server to parse requests with url encoded payloads
app.use(express.urlencoded({ extended: false }));

//set up the session for the server
app.use(session({
		secret: SALT, ///the salt to encrypt the information in the session
		resave: false, //do not resave session variables if nothing is changed
		saveUninitialized: false //do not save uninitialized variables
	})
);

//use the cookie parser for sessions
app.use(cookieParser());

//allow the app to use flash messages
app.use(flash());

//declare a static directory for things like stylesheets and other content
app.use(express.static('views'));

//declare a static directory for the file contents of the site
app.use(express.static("storage"));

//export the variables
module.exports = {
	app,
	client,
	middleware,
	PORT,
	server,
	liveWss,
	chatWss,
	nms
}
