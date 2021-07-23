const redis = require("redis");
const {promisify} = require("util");
const redisClient = redis.createClient({port: 6379});

//define an asynchronous version of the "get" and "keys" functions to not have callback hell
redisClient.getAsync = promisify(redisClient.get).bind(redisClient);
redisClient.keysAsync = promisify(redisClient.keys).bind(redisClient);
redisClient.sendCommandAsync = promisify(redisClient.send_command).bind(redisClient);

//export both of the clients
module.exports = redisClient;
