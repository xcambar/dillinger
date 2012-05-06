var fs = require('fs'),
    path = require('path');

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

function loadEnvConfigFile (file) {
    var env = process.env.NODE_ENV;
    var filePath = [__dirname, 'config'];
    if (env === 'production') {
        filePath.push(file);
        return JSON.parse(fs.readFileSync(filePath.join('/'), 'UTF-8'));
    } else {
        filePath = filePath.concat([env, file]);
        var fullPath = filePath.join('/');
        if (path.existsSync(fullPath)) {
            return JSON.parse(fs.readFileSync(fullPath), 'UTF-8');
        } else {
            filePath.splice(filePath.length - 2, 1);
            return JSON.parse(fs.readFileSync(filePath.join('/'), 'UTF-8'));
        }
    }
}

var appConfig = loadEnvConfigFile('app.json');
appConfig.github = loadEnvConfigFile('github.json');
appConfig.redis = loadEnvConfigFile('redis.json');


// If hacking on localhost/local machine
if (appConfig.LOCALHOST) {
  appConfig.PORT = debug ? 5050 : appConfig.PORT;
}
appConfig.debug = process.env.NODE_ENV === 'development' ? true : false;



exports = module.exports = appConfig;
