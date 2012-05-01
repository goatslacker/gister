/*jshint asi: true */
var request = require('request')
var EventEmitter = require('events').EventEmitter

// Rate limiting
var time = null
var rate = 1

// ## Gist
//
// Constructs a new Gist object.
// Instance of EventEmitter.
//
// **o** is an Object which contains
//
// * __username__ GitHub username
// * __token__ Your secret API token, can be found in [Account Settings](https://github.com/account/admin)
// * __gist_id__ (optional) The Gist ID
function Gist(o) {
  EventEmitter.call(this)

  o = o || {}

  this.username = o.username
  this.password = o.password
  this.token = o.token
  this.gist_id = o.gist_id
}

Gist.prototype = Object.create(EventEmitter.prototype)

function response(self, statuses) {
  return function (err, response, body) {
    if (err) {
      return self.emit('err', err)
    }

    var limit = response.headers['x-ratelimit-remaining']
    if (limit) {
      rate = limit
    }

    var cb = statuses[response.statusCode]
    if (cb) {
      return cb(body, response)
    }

    switch (response.statusCode) {
    case 201:
      self.emit('created', body, response)
      break
    case 404:
      self.emit('error:notfound', body, response)
      break
    default:
      self.emit('err', body, response)
    }
  }
}

function xhr(opts, data, cb, name) {
  // if we're over the limit
  if (rate <= 0) {
    // if it's been over an hour, reset the rate
    // and reset the timer
    if (Date.now() > time + 360000) {
      time = null
      rate = 1
    } else {
      return this.emit('error:ratelimit', 'Over rate limit: http://developer.github.com/v3/#rate-limiting')
    }
  }

  if (data) {
    if (this.token) {
      opts.headers = { 'Authorization': 'token ' + this.token }
    } else if (this.username && this.password) {
      opts.headers = { 'Authorization': 'Basic ' + new Buffer(this.username + ':' + this.password).toString('base64') }
    } else {
      return this.emit('error:credentials', 'No OAuth token or username and password provided')
    }

    opts.json = {
      description: '',
      files: {},
      public: true
    }

    opts.json.files[name] = { content: data }

//    Object.keys(data).forEach(function (name) {
//      opts.json.files[name] = { content: data[name] }
//    })
  }

  return this.request(opts, cb)
}

// Uses request to talk to GitHub API.
// Provided in the prototype so request can be mocked for tests.
Gist.prototype.request = function (opts, cb) {
  time = time || Date.now()
  return request(opts, cb)
}

Gist.prototype.auth = function (appName) {
  if (!appName) {
    throw new ReferenceError('Application Name is missing')
  }

  this.token = null

  if (!this.username || !this.password) {
    return this.emit('error:credentials', 'No OAuth token or username and password provided')
  }

  var opts = { method: 'POST', uri: 'https://api.github.com/authorizations' }
  opts.headers = { 'Authorization': 'Basic ' + new Buffer(this.username + ':' + this.password).toString('base64') }
  opts.json = { scopes: ['gist'], note: appName }

  var res = response(this, {
    201: function (body) {
      this.token = body.token
      this.emit('token', this.token)
    }.bind(this)
  })

  return xhr.bind(this)(opts, null, res)
}

// Retrieves a gist from gist.github.com
//
// Uses `gist_id` to determine which gist it'll retrieve
// compatible with GitHub API v3
//
// If no `gist_id` is provided, event **error:gist_id** is emitted.
//
// On success, event **get** is emitted with `body` passed.
// `body` is the response from GitHub.
Gist.prototype.get = function (name) {
  var gist = this

  if (!this.gist_id) {
    return this.emit('error:gist_id', 'No gist id provided')
  }

  var opts = {
    uri: 'https://api.github.com/gists/' + this.gist_id
  }

  var res = response(this, {
    200: function (body) {
      if (name) {
        var data = JSON.parse(body)
        return gist.emit('get', data.files[name])
      }

      return gist.emit('get', body)
    }
  })

  return xhr.bind(this)(opts, null, res, name)
}


// Convenience method which will create a new gist
// if `gist_id` is not provided. If it is provided,
// the gist will be updated.
//
// Parameter __data__ is the data to create/edit to gist
Gist.prototype.sync = function (data, name) {
  if (!this.gist_id) {
    return this.create(data, name)
  }

  return this.edit(data, name)
}

// Edits a gist
//
// Compatible with GitHub API v2. Success is status code 302.
//
// If no `gist_id` is provided, event **error:gist_id** is emitted.
//
// On success, event **updated** is emitted with
// `body`, the response from GitHub.
Gist.prototype.edit = function (data, name) {
  if (!this.gist_id) {
    return this.emit('error:gist_id', 'No gist id provided')
  }

  var opts = {
    uri: 'https://api.github.com/gists/' + this.gist_id,
    method: 'PATCH'
  }
  var req = xhr.bind(this)

  req(opts, data, response(this, { 200: function (body) {
    this.emit('updated', body)
  }.bind(this) }), name)
}

// Creates a new gist
//
// Compatible with GitHub API v2. Success is status code 302.
//
// On success, event **created** is emitted with
// `body` as well as the new `gist_id`.
Gist.prototype.create = function (data, name) {
  var opts = {
    uri: 'https://api.github.com/gists',
    method: 'POST'
  }
  var req = xhr.bind(this)

  req(opts, data, response(this, { 201: function (body, res) {
    var gist = /(\d+)/
    var location = res.headers.location
    var gist_id = null

    if (gist.test(location)) {
      gist_id = gist.exec(location)[0]
    }

    this.emit('created', body, gist_id)
  }.bind(this) }), name)
}

module.exports = Gist
