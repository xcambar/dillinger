var dbox = require('./utils/dropbox').dropbox,
    appConfig = require('./config'),
    fs = require('fs'),
    md = require('./utils/md').md,
    githubProxy = require('./utils/github'),
    dropboxProxy = require('./utils/dropbox')(appConfig.dropbox.consumer_key, appConfig.dropbox.consumer_secret),
    request = require('request'),
    qs = require('querystring');


// Routes
function initRoutes (app) {
  app.get('/', function(req, res, next){
    if (!req.session) {
      return next('Session not initialized');
    }
    // if(typeof req.session.dropbox !== 'undefined' && typeof req.session.dropbox.access_token !== 'undefined'){
      
    //   // Create a new request token on every request
    //   dbox.forceNewRequestToken(function(err, data){
    //     if (err) {
    //       next(err);
    //     } else{
    //       res.local('dropbox',{
    //         sync : true,
    //         request_token: dbox.getRequestToken(),
    //         oauth_callback: dbox.getOauthCallback()
    //       });
          
    //       dbox.setAccessToken(req.session.dropbox.access_token);
    //       dbox.setAccessTokenSecret(req.session.dropbox.access_token_secret);

    //       dbox.getAccountInfo(function(err, data){
    //         if(err){
    //           // If this fails, the token is old or something else is
    //           // wrong so let's delete it and redirect, thus trying agin.
    //           delete req.session.dropbox;
    //           return res.redirect('/');
    //         } else {
    //           // If there's no error, let's now check Github's oauth setting.
              
    //           res.local('dropbox', {
    //             sync : true,
    //             request_token: dbox.getRequestToken(),
    //             oauth_callback: dbox.getOauthCallback()
    //           });
    //           return checkGithubOauth(req, res, next);
    //         }
    //       });
    //     }
    //   });
    // } else{
    //   // Create a new request token on every request
    //   dbox.forceNewRequestToken(function(err, data){
    //     if(err) {
    //       next(err);
    //     } else{
    //       res.local('dropbox',{
    //         sync : null,
    //         request_token: dbox.getRequestToken(),
    //         oauth_callback: dbox.getOauthCallback()
    //       });
    //       checkGithubOauth(req, res, next);
    //     }
    //   });
    // }
    res.render('dillinger', {
      title: 'Dillinger, the last Markdown editor, ever.',
      version: appConfig.VERSION,
      debugging: appConfig.debug,
      layout: 'dillinger-layout',
      loggedIn: false,
      github: !!req.session.github ? req.session.github : false,
      dropbox: !!req.session.dropbox ? req.session.dropbox : false
    });
  });

  app.get('/github/authorizeApp', function (req, res, next) {
    var url = "https://github.com/login/oauth/authorize?" +
      "client_id=" + appConfig.github.client_id +
      "&scope=repo" +
      "&redirect_uri=" + appConfig.github.callback_url;
    res.redirect(url);
  });

  /*
   * OAuth callback
   */
  app.get('/oauth/github', function(req, res, next) {
    if (!req.query.code) {
      next();
    } else {
      var paramsObj = {
        code: req.query.code,
        client_id: appConfig.github.client_id,
        redirect_url: appConfig.github.redirect_uri,
        client_secret: appConfig.github.client_secret
      };
    
      var opts = {
        uri: 'https://github.com/login/oauth/access_token?' + qs.stringify(paramsObj)
      };

      request.post(opts, function(err, resp, body){
        req.session.github = req.session.github || {};
        if(err) {
          res.send(err.message);
        } else {
          req.session.github.access_token = qs.decode(body).access_token;
          githubProxy.getCurrentUserInfo(req.session.github.access_token, function (err, data) {
            console.log('HOP', req.session);
            if (err) {
              res.send(err);
            } else {
              var d = JSON.parse(data);
              req.session.github.username = d.login;
              res.redirect('/');
            }
          });
        }
      });
    }
  });

  function _defaultHandler (res) {
    return function _defaultHandlerReal (err, data) {
      if (err) {
        res.send({
          error: 'Request error.',
          data: err
        });
      } else {
        res.json(data);
      }
    };
  }

  /* Github Actions */
  app.post('/github/repo/fetch_all', function (req, res) {
    githubProxy.fetchUserRepos(req.session.github.access_token, _defaultHandler(res));
  });

  app.post('/github/repo/fetch_branches', function(req,res){
    githubProxy.fetchUserRepositoryBranches(
      req.session.github.access_token,
      req.session.github.username,
      req.body.repo,
      _defaultHandler(res)
    );
  });

  app.post('/github/repo/fetch_tree_files', function (req,res){
    githubProxy.fetchUserRepositoryTreeFiles(
      req.session.github.access_token,
      req.session.github.username,
      req.body.repo,
      req.body.sha,
      _defaultHandler(res)
    );
  });

  app.post('/github/repo/fetch_markdown_file', function (req,res){
    githubProxy.fetchFileFromURL(req.session.github.access_token, req.body.mdFile, function (err, data) {
      if (err) {
        res.send({
          error: 'Request error.',
          data: err
        });
      } else {
        res.json({data: data});
      }
    });
  });








  app.get('/dropbox/authorizeApp', function (req, res, next) {
    dropboxProxy.getRequestToken(function (err, data) {
      req.session.dropbox = data;
      var url = "https://www.dropbox.com/1/oauth/authorize?" +
        "oauth_token=" + data.oauth_token +
        "&oauth_callback=" + appConfig.dropbox.oauth_callback;
      res.redirect(url);
    });
  });

  /* Dropbox OAuth */
  app.get('/oauth/dropbox', function (req, res, next) {
    if(!req.query.oauth_token) {
      next();
    } else {
      req.session.dropbox.oauth_token = req.query.oauth_token;
      req.session.dropbox.uid = req.query.uid;
      dropboxProxy.getAccessToken(req.session.dropbox.oauth_token, req.session.dropbox.oauth_token_secret, function (err, data) {
        if (err) {
          res.send('Error while fetching access token: ' + err);
        } else {
          delete req.session.dropbox.oauth_token;
          delete req.session.dropbox.oauth_token_secret;
          req.session.dropbox.access_token_secret = data.oauth_token_secret;
          req.session.dropbox.access_token = data.oauth_token;
          res.redirect('/');
        }
      });
    }
  });

  /* Dropbox Actions */

  // Search for all .md files.
  app.get('/dropbox/search', function (req, res){
    if(typeof req.session.dropbox === 'undefined') {
      return res.json( { "data": "Not authorized with Dropbox."} );
    }
    dropboxProxy.searchForMdFiles(
      req.session.dropbox.access_token,
      req.session.dropbox.access_token_secret,
      function (err, data) {
        res.json(err);
    });
  });
  
  app.get('/dropbox/account/info', function (req,res) {
    if (typeof req.session.dropbox === 'undefined') {
      return res.json({
        "data": "You must authorize Dropbox first before using this action."
      });
    }
    dropboxProxy.getAccountInfo(
      req.session.oauth_token,
      req.session.oauth_token_secret,
      function (err,data) {
        if (err) {
          res.json(err);
        } else {
          res.send(data);
        }
      }
    );
  });

  // Basically your directory listing with 'dropbox' as the root.
  app.get('/dropbox/metadata', function(req,res){
    
    if(typeof req.session.dropbox === 'undefined') return res.json( { "data": "Not authorized with Dropbox."} );

    dbox.getMetadata( function(err,data){

      if(err){
        console.error(err);
        res.json(err);
      }
      else{
        res.json(JSON.parse(data));
      }
      
    });  // end getMetadata()
    
  });

  // Fetch a .md file's contents.
  app.post('/dropbox/files/get', function(req,res){

    if(typeof req.session.dropbox === 'undefined') return res.json( { "data": "Not authorized with Dropbox."} )
    
    var pathToMdFile = req.body.mdFile
    
    // For some reason dropbox needs me to do this...
    // Otherwise, spaces and shit get fuct up
    // TODO: DRY THIS UP
    var name = pathToMdFile.split('/').pop()
    var encodedName = encodeURIComponent(name)
    pathToMdFile = pathToMdFile.replace(name, encodedName)
    
    dbox.getMdFile(pathToMdFile, function(err,filedata){

      if(err){
        console.error(err)
        res.json(err)
      }
      else{
        res.json({data: filedata})
      }
      
    })  // end getMdFile()
    
  })

  app.post('/dropbox/files/put', function(req,res){

    if(typeof req.session.dropbox === 'undefined') return res.json( { "data": "Not authorized with Dropbox."} )
    
    var pathToMdFile = req.body.pathToMdFile || '/Dillinger/' + md.generateRandomMdFilename('md')
    var contents = req.body.fileContents || 'Test Data from Dillinger.'
    
    // For some reason dropbox needs me to do this...
    // Otherwise, spaces and shit get fuct up
    var name = pathToMdFile.split('/').pop()
    var encodedName = encodeURIComponent(name)
    pathToMdFile = pathToMdFile.replace(name, encodedName)

    dbox.putMdFile(pathToMdFile, contents, function(err,filedata){

      if(err){
        console.error(err)
        res.json(err)
      }
      else{
        res.json({data: filedata})
      }
      
    })  // end getMdFile()
    
  })


  /* Dillinger Actions */
  // save a markdown file and send header to download it directly as response 
  app.post('/factory/fetch_markdown', function(req,res){
    
    var unmd = req.body.unmd
      , json_response = 
      {
        data: ''
      , error: false
      }
        
    // TODO: maybe change this to user submitted filename or name of repo imported file?
    var name = md.generateRandomMdFilename('md') 
    var filename = ( __dirname + '/public/files/md/' + name )
    
    // TODO: THIS CAN BE OPTIMIZED WITH PIPING INSTEAD OF WRITING TO DISK
    fs.writeFile( filename, unmd, 'utf8', function(err, data){

      if(err){
        json_response.error = true
        json_response.data = "Something wrong with the markdown conversion."
        res.send( JSON.stringify( json_response) );
        if(debug) throw err     
      }
      else{
        json_response.data = name
        res.send( JSON.stringify( json_response) );
       }
    }) // end writeFile
    
  }) // end post

  // save a html file and send header to download it directly as response 
  app.post('/factory/fetch_html', function(req,res){
    
    var unmd = req.body.unmd
      , json_response = 
      {
        data: ''
      , error: false
      }
      
    var html = md.getHtml(req.body.unmd)  
    
    var name = md.generateRandomMdFilename('html') 
    
    var filename = ( __dirname + '/public/files/html/' + name )
    
    fs.writeFile( filename, html, 'utf8', function(err, data){

      if(err){
        json_response.error = true
        json_response.data = "Something wrong with the markdown conversion."
        res.send( JSON.stringify( json_response) );
        if(debug) throw err     
      }
      else{
        json_response.data = name
        res.send( JSON.stringify( json_response) );
       }
    }) // end writeFile
    
  }) // end post

  // route to handle download of md file
  app.get('/files/md/:mdid', function(req, res){
    
    var fileId = req.params.mdid
    
    var filename = __dirname + '/public/files/md/' + fileId
    
    res.attachment(filename)
    
    res.download(filename, function(err){
      if(err) console.error(err) 
      else{
        // Delete the file after download
        fs.unlink(filename, function(err, data){
          if(err) console.error(err)
        })
      }
    })

  })

  // route to handle download of html file
  app.get('/files/html/:html', function(req, res){
    
    var fileId = req.params.html
    
    var filename = __dirname + '/public/files/html/' + fileId
    
    res.attachment(filename)
    res.download(filename, function(err){
      if(err) console.error(err)
      else{
        // Delete the file after download
        fs.unlink(filename, function(err, data){
          if(err) console.error(err)
        })
      }
    })

  })
}

exports = module.exports = {
  add: function (app) {
    initRoutes(app);
  }
}