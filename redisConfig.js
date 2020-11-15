const redis = require("redis");
const {promisify} = require("util");
const redisClient = redis.createClient();

redisClient.getAsync = promisify(redisClient.get).bind(redisClient);

module.exports = redisClient;
