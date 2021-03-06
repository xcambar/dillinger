#!/usr/bin/env node
var express = require('express'),
    stylus = require('stylus'),
    cluster = require('cluster'),
    redis = require('redis'),
    appConfig = require('./config'),
    dillingerReadme = require('fs').readFileSync(__dirname + '/README.md', 'UTF-8');

var app = module.exports = express.createServer();

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Configuration

app.configure(function(){
  var RedisStore = require('connect-redis')(express);
  // Initialize Redis connection
  var redisClient = initRedis();
  
  redisClient.on('connect', function () {
    var redisOptions = {
      client: redisClient,
      port: appConfig.redis.port,
      host: appConfig.redis.host,
      pass: appConfig.redis.password
    };
    app.use(express.session({ secret: "dillinger", cookie: { maxAge: 60000*( (60*24) * 30)}, store: new RedisStore(redisOptions) })); // 30 days
    require('./routes').add(app);
    init();
  });
});

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser());
//app.use(express.session({ secret: "dillinger", cookie: { maxAge: 60000*( (60*24) * 30)}})); // 30 days
app.use(stylus.middleware({
  src: __dirname + "/public",
  compile: !appConfig.debug
}));
app.use(express.static(__dirname + '/public'));

app.dynamicHelpers({
    readme: function(req,res)
    {
      return dillingerReadme.toString();
    }// end readme
});
function initRedis(){
  var redisClient = redis.createClient(appConfig.redis.port, appConfig.redis.host, appConfig.redis);

  redisClient.on("error", function (err) {
      console.log("Redis connection error to " + redisClient.host + ":" + redisClient.port + " - " + err);
  });

  redisClient.on("connect", function (err) {
    if (err) {
      console.error(err);
    } else {
      if (appConfig.redis.password) {
        redisClient.auth(appConfig.redis.password);
      }
    }
  });
  return redisClient;
}

function init(){
  app.use(app.router);
  if (cluster.isMaster) {
    // Fork workers.
    for (var i = 1; i < (appConfig.debug ? 1 : appConfig.maxThreads); i++) {
      cluster.fork();
    }
    
    app.listen(appConfig.PORT);
    
    cluster.on('death', function(worker) {
      // We need to spin back up on death.
      cluster.fork();
      console.log('worker ' + worker.pid + ' died');
    });
  } else {
    app.listen(appConfig.PORT);
  }
}