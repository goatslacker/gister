var request = require('request');
var EventEmitter = require('events').EventEmitter;

function Gist(o) {
  EventEmitter.call(this);

  this.username = o.username;
  this.token = o.token;
  this.gist_id = o.gist_id;
}

Gist.prototype = Object.create(EventEmitter.prototype);

function response(statusCode, cb) {
  return function (err, response, body) {
    if (err) throw err;

    if (response.statusCode !== statusCode) {
      throw new Error(body);
    }

    cb && cb(body, response);
  };
}

Gist.prototype.request = function (opts, data, cb) {
  if (data) {
    if (!this.username || !this.token) {
      return this.emit("error:credentials");
    }

    opts.form = {
      login: this.username,
      token: this.token,
      "file_contents[gistfile1json]": data,
      "file_name[gistfile1json]": "", // TODO
      "file_ext[gistfile1json]": "" // TODO
    };
  }

  return request(opts, cb);
};

Gist.prototype.get = function () {
  if (!this.gist_id) {
    return this.emit('error:gist_id');
  }

  var uri = 'https://api.github.com/gists/' + this.gist_id;

  this.request({ uri: uri }, null, response(200, function (body) {
    this.emit('get', body);
  }.bind(this)));
};

Gist.prototype.sync = function (data) {
  if (!this.gist_id) {
    return this.post(data);
  } else {
    return this.put(data);
  }
};

Gist.prototype.put = function (data) {
  var opts = {
    uri: 'https://gist.github.com/gists/' + this.gist_id,
    method: 'PUT'
  };

  this.request.put(opts, data, response(302, function (body) {
    this.emit('put', body);
  }.bind(this)));
};

Gist.prototype.post = function (data) {
  var opts = {
    uri: 'https://gist.github.com/gists',
    method: 'POST'
  };

  this.request(opts, data, response(302, function (body, res) {
    var gist = /(\d+)/;
    var location = res.headers.location;
    var gist_id = null;

    if (gist.test(location)) {
      gist_id = gist.exec(location)[0];
    }

    this.emit('post', body, gist_id);
  }.bind(this)));
};

module.exports = Gist;
