//require the postgres module and configure the dotenv module to allow node.js to access environment variables
const pg = require("pg");
require('dotenv').config();

//set up the connection string to connect to the database
var connString = `postgres://${process.env.NAME}:${process.env.PASS}@${process.env.HOST}:${process.env.PORT}/${process.env.DBNAME}`;

//create the client for the database
var client = new pg.Client(connString);

//set up the client to be ready to accept queries
client.connect();

//export the client as a module to be accessed in the index file for the server
module.exports = client;
