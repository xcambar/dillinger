var fs = require('fs');

var appConfig = JSON.parse(fs.readFileSync(__dirname + '/config/app.json', 'UTF-8'));

appConfig.github = JSON.parse(fs.readFileSync(__dirname + '/config/github.json', 'UTF-8'));
appConfig.redis = JSON.parse(fs.readFileSync(__dirname + '/config/redis.json', 'UTF-8'));

// If hacking on localhost/local machine
if (appConfig.LOCALHOST) {
  appConfig.PORT = debug ? 5050 : appConfig.PORT;
}

appConfig.debug = process.env.NODE_ENV ? true : false;

exports = module.exports = appConfig;