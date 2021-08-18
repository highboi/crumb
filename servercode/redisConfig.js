const redis = require("redis");
const {promisify} = require("util");
const redisClient = redis.createClient({port: 6379});

redisClient.getAsync = promisify(redisClient.get).bind(redisClient);
redisClient.keysAsync = promisify(redisClient.keys).bind(redisClient);
redisClient.sendCommandAsync = promisify(redisClient.send_command).bind(redisClient);

module.exports = redisClient;
