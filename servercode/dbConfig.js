const pg = require("pg");

var connString = `postgres://${process.env.NAME}:${process.env.PASS}@${process.env.HOST}:${process.env.PORT}/${process.env.DBNAME}`;
var client = new pg.Client(connString);
client.connect();

module.exports = client;
