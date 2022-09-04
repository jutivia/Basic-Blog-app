const mongoose = require('mongoose');
const redis = require("redis");
const util = require("util");

const exec = mongoose.Query.prototype.exec;
const redisUrl = "redis://127.0.0.1:6379";
const client = redis.createClient(redisUrl);
client.hget = util.promisify(client.hget);
// client.set = util.promisify(client.set);

mongoose.Query.prototype.cache = function (options = {}) {
    this.useCache = true;
    console.log(options)
    this.haskKey = JSON.stringify(options.key || 'default')
    return this
}

mongoose.Query.prototype.exec = async function () {
    console.log("i'm running a query")
    // console.log(this.getQuery())
    // console.log(this.mongooseCollection.name)
    if (!this.useCache)  {
        return await exec.apply(this, arguments); 
    }
    const key = Object.assign({}, this.getQuery(), {
        collection: this.mongooseCollection.name
    })
    // console.log('cache', this.useCache)
        const keyString = JSON.stringify(key)
        const value = await client.hget(this.haskKey, keyString);
        if (value) {
            console.log('cache exists')
            const doc = JSON.parse(value);
            // console.log("val is here", this.model, this.mongooseCollection.name);
            Array.isArray(doc) ? doc.map(x => new this.model(x)) : doc;
            return doc
        }

        // console.log(value)
        const result = await exec.apply(this, arguments);
        // console.log(result);
        const stringObject = JSON.stringify(result)
        client.hset(this.haskKey, keyString, stringObject, 'EX', 10)
        console.log('res', result)
        return result
}
const clearHash = (hashKey) => {
    client.del(JSON.stringify(hashKey))
}

module.exports = { clearHash }