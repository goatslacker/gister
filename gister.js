var request = require('request');
var EventEmitter = require('events').EventEmitter;

function GitHub(o) {
  EventEmitter.call(this);

  this.username = o.username;
  this.token = o.token;
  this.gist_id = o.gist_id;
}

GitHub.prototype = Object.create(EventEmitter.prototype);

function response(statusCode, cb) {
  return function (err, response, body) {
    if (err) throw err;

    if (response.statusCode !== statusCode) {
      throw new Error(body);
    }

    cb && cb(body, response);
  };
}

GitHub.prototype.getRequest = function (uri, data) {
  return {
    uri: uri,
    form: {
      login: this.username,
      token: this.token,
      "file_contents[gistfile1json]": data,
      "file_name[gistfile1json]": "", // TODO
      "file_ext[gistfile1json]": "" // TODO
    }
  };
};

GitHub.prototype.get = function () {
  if (!this.gist_id) {
    return this.emit('error:gist_id');
  }

  var uri = 'https://api.github.com/gists/' + this.gist_id;

  request(uri, response(200, function (body) {
    this.emit('get', body);
  }.bind(this)));
};

GitHub.prototype.sync = function (data) {
  this.checkCredentials();

  if (!this.gist_id) {
    return this.post(data);
  } else {
    return this.put(data);
  }
};

GitHub.prototype.checkCredentials = function () {
  if (!this.username || !this.token) {
    return this.emit("error:credentials");
  }
};

GitHub.prototype.put = function (data) {
  this.checkCredentials();

  var opts = this.getRequest('https://gist.github.com/gists/' + this.gist_id, data);

  request.put(opts, response(302, function (body) {
    this.emit('put', body);
  }.bind(this)));
};

GitHub.prototype.post = function (data) {
  this.checkCredentials();

  var opts = this.getRequest('https://gist.github.com/gists', data);

  request.post(opts, response(302, function (body, res) {
    this.emit('post', body, res);
  }.bind(this)));
};

module.exports = GitHub;
