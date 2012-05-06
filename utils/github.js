var github_api = 'https://api.github.com',
    request = require('request');

function fetchUserRepos (authKey, callback) {
  var github_url = github_api + '/user/repos?access_token=' + authKey;
    
  request.get(github_url, function(err, resp, data){
    if(err) {
      callback.call(resp, err);
    } else if(resp.statusCode === 200) {
      var set = [],
          parsedData = JSON.parse(data);

      parsedData.forEach(function (el) {
        var item = {
          "url": el.url,
          "private": el.private
        };
        set.push(item);
      });
      callback.call(resp, null, parsedData);
    } else{
      callback.call(resp, 'Unable to fetch repos from Github. Code: ' + resp.statusCode);
    }
  });
}

function fetchUserRepositoryBranches (authKey, username, repo, callback) {
  var github_url = github_api +
    '/repos/' +
    username  +
    '/' +
    repo +
    '/branches?access_token=' +
    authKey;

  request.get(github_url, function(err, resp, data){
    if(err) {
      callback.call(resp, err);
    } else if(resp.statusCode === 200) {
      callback.call(resp, null, JSON.parse(data));
    }
    else{
      callback.call(resp, 'Unable to fetch repos from Github. Code: ' + resp.statusCode);
    }
  });
}

function fetchUserRepositoryTreeFiles (authKey, username, repo, sha1, callback) {
  var github_url = github_api +
    '/repos/' +
    username +
    '/' +
    repo +
    '/git/trees/' +
    sha1 +
    '?recursive=1&access_token=' +
    authKey;

  request.get(github_url, function(err, resp, data) {
    if(err) {
      callback.call(resp, err);
    } else if(resp.statusCode === 200) {
      callback.call(resp, null, JSON.parse(data));
    } else {
      callback.call(resp, 'Unable to fetch repository files from Github. Code: ' + resp.statusCode);
    }
  });
}

/**
 * This function requires an update. We should not have to use the whole URL
 * @TODO Change interface
 * @TODO use url module to safely add the parameter
 **/
function fetchFileFromURL (authKey, url, callback) {
  if (/blob/.test(url)) {
    url += ("&access_token=" + authKey);
  }
  request.get(url, function(err, resp, data) {
    if(err) {
      callback.call(resp, err);
    } else if(resp.statusCode === 200) {
      callback.call(resp, null, data);
    } else {
      callback.call(resp, 'Unable to fetch repos from Github. Code: ' + resp.statusCode);
    }
  });
}

function getCurrentUserInfo (authKey, callback) {
  var url = github_api + '/user?access_token=' + authKey;
  request.get(url, function (err, resp, data) {
    if(err) {
      callback.call(resp, err);
    } else if(resp.statusCode === 200) {
      callback.call(resp, null, JSON.parse(data));
    } else {
      callback.call(resp, 'Unable to fetch user info from Github. Code: ' + resp.statusCode);
    }
  });
}

exports = module.exports = {
  "fetchUserRepos" : fetchUserRepos,
  "fetchUserRepositoryBranches" : fetchUserRepositoryBranches,
  "fetchUserRepositoryTreeFiles" : fetchUserRepositoryTreeFiles,
  "fetchFileFromURL" : fetchFileFromURL,
  "getCurrentUserInfo" : getCurrentUserInfo
};