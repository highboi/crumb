const pg = require("pg");

require('dotenv').config();

//get credentials from the environment variables in the .env file
var name = process.env.NAME;
var pass = process.env.PASS;
var host = process.env.HOST;
var port  = process.env.PORT;
var dbName = process.env.DBNAME;

//set up the connection string to connect to the database
var connString = `postgres://${name}:${pass}@${host}:${port}/${dbName}`;

//create the client for the database
var client = new pg.Client(connString);

//set up the client to be ready to accept queries
client.connect();

//export the client as a module to be accessed in the index file for the server
module.exports = client;
