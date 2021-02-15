//this is a program that resets the database table "commonwords" to contain the words in the default wordlist on the server
//with default scores of 0

//get the redis client, fs, readline, and configure the program to use .env variables
const client = require("./dbConfig");
const fs = require("fs");
const readline = require("readline");
require("dotenv").config();


async function execute() {
	//delete all of the words in the commonwords table
	await client.query("DELETE FROM commonwords");

	//create an interface to read the lines from the wordlist file
	var interface = readline.createInterface({
		input: fs.createReadStream(process.env.WORDLIST)
	});

	//whenever a newline comes up, add it to the redis store
	interface.on("line", (line) => {
		console.log("-".repeat(30));
		console.log("WORD:", line);
		await client.query(`INSERT INTO commonwords (word, score) VALUES ($1, $2)`, [line, 0]);
		console.log("-".repeat(30));
	});

	//whenever the file closes, print a message and end the program (does not end itself for some reason)
	interface.on("close", () => {
		console.log("\n\n");
		console.log("|".repeat(30));
		console.log("ENDED");
		console.log("|".repeat(30));
		console.log("\n\n");
		process.exit();
	});
}

execute();
