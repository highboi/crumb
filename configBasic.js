//this file contains the basic configuration for the server

const express = require("express");
const session = require("express-session");
const flash = require("connect-flash");
const WebSocket = require("ws");

//generate the express app
const app = express();

//make a server variable
const server = require("http").createServer(app);

//make a websocket server
const wss = new WebSocket.Server({server});

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
		cookie: {maxAge: 60000},
		secret: SALT, ///the salt to encrypt the information in the session
		resave: false, //do not resave session variables if nothing is changed
		saveUninitialized: false //do not save uninitialized variables
	})
);

//allow the app to use flash messages
app.use(flash());

//declare a static directory for things like stylesheets and other content
app.use(express.static('views'));

//declare a static directory for the file contents of the site
app.use(express.static("storage"));

//this is a global view object to use in each view rendered
var viewObject = {};

//export the variables
module.exports = {
	app,
	client,
	middleware,
	PORT,
	viewObject,
	server,
	wss
}
