/*jshint asi: true, expr: true, curly: false */
var request = require('request')
var EventEmitter = require('events').EventEmitter

var url = 'https://api.github.com'

// Rate limiting
var time = null
var rate = 1

function api(uri, method) {
  var opts = {
    uri: 'https://api.github.com/' + uri,
    method: method,
    json: {}
  }

  return opts
}

api.all = function (id) {
  var opts
  if (id) {
    opts = api('users', 'GET')
    opts.uri += '/' + id + '/gists'
  } else {
    opts = api('gists', 'GET')
  }
  return opts
}

api.star = function (id) {
  var opts = api('gists', 'PUT')
  opts.uri += '/' + id + '/star'
  return opts // 204
}

api.unstar = function (id) {
  var opts = api('gists', 'DELETE')
  opts.uri += '/' + id + '/star'
  return opts // 204
}

api.is_star = function (id) {
  var opts = api('gists', 'GET')
  opts.uri += '/' + id + '/star'
  return opts // 204
}

api.get = function (id) {
  var opts = api('gists', 'GET')
  opts.uri += '/' + id
  return opts
}

api.create = function (data) {
  var opts = api('gists', 'POST')
  opts.json = add_data(data)
  return opts
}

api.patch = function (data, id) {
  var opts = api('gists', 'PATCH')
  opts.uri += '/' + id
  opts.json = add_data(data)
  return opts
}

api.auth = function (appName) {
  var opts = api('authorizations', 'POST')
  opts.json = { scopes: ['gist'], note: appName }
  return opts
}

function response(callbacks) {
  var gist = this

  return function (err, res, body) {
    // return if there's an error
    if (err) return gist.emit('error', err)

    // update our rate limit counter
    var limit = res.headers['x-ratelimit-remaining']
    limit && (rate = limit)

    // if we have a callback attached, call it
    var cb = callbacks[res.statusCode]
    if (cb) return cb(body, res)

    // otherwise it's an error
    return gist.emit('error', new Error(body.message), body, res)
  }
}

function check_gist_id(gist_id) {
  gist_id = gist_id || this.gist_id
  if (!gist_id) throw new ReferenceError('No gist id provided')

  return gist_id
}

function check_data(data) {
  if (!data || typeof data !== 'object')
    throw new TypeError('Expected data to be an Object')
}

function add_data(data) {
  if (data.files) {
    return data
  }

  var json = {
    description: '',
    files: {},
    public: true
  }

  Object.keys(data).forEach(function (name) {
    json.files[name] = { content: data[name] }
  })

  return json
}

function authenticate(opts) {
  // authentication
  if (Object.keys(opts.json).length > 0) {
    if (this.token) {
      opts.headers = { 'Authorization': 'token ' + this.token }
    } else if (this.username && this.password) {
      opts.headers = { 'Authorization': 'Basic ' + new Buffer(this.username + ':' + this.password).toString('base64') }
    } else {
      throw new ReferenceError('No OAuth token or username and password provided')
    }
  }

  return opts
}

function xhr(opts, callbacks) {
  // set the time if it isn't set
  time = time || Date.now()

  opts = authenticate.call(this, opts)

  return this.request(opts, response.call(this, callbacks))
}


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

// Uses request to talk to GitHub API.
Gist.prototype.request = function (opts, cb) {
  return request(opts, cb)
}

Gist.prototype.get = function (gist_id, name) {
  gist_id = check_gist_id.call(this, gist_id)

  return xhr.call(this, api.get(gist_id), {
    200: function (body) {
      if (name) {
        var data = JSON.parse(body)
        return this.emit('gist', data.files[name])
      }

      return this.emit('gist', body)
    }.bind(this)
  })
}

Gist.prototype.getAll = function (user_id) {
  return xhr.call(this, api.all(user_id), {
    200: function (body) {
      this.emit('gists', body)
    }.bind(this)
  })
}

Gist.prototype.auth = function (appName) {
  if (!appName) throw new ReferenceError('Application Name is missing')

  this.token = null

  return xhr.call(this, api.auth(appName), {
    201: function (body) {
      this.token = body.token
      this.emit('token', this.token)
    }.bind(this)
  })
}

// Convenience method which will create a new gist
// if `gist_id` is not provided. If it is provided,
// the gist will be updated.
//
// Parameter __data__ is the data to create/edit to gist
Gist.prototype.sync = function (data, gist_id) {
  if (!gist_id && !this.gist_id) {
    return this.create(data)
  }

  return this.edit(data, gist_id)
}

// Edits a gist
//
// Compatible with GitHub API v2. Success is status code 302.
//
// If no `gist_id` is provided, event **error:gist_id** is emitted.
//
// On success, event **updated** is emitted with
// `body`, the response from GitHub.
Gist.prototype.edit = function (data, gist_id) {
  gist_id = check_gist_id.call(this, gist_id)
  check_data(data)

  return xhr.call(this, api.patch(data, gist_id), {
    200: function (body) {
      this.emit('edited', body)
    }.bind(this)
  })
}

// Creates a new gist
//
// Compatible with GitHub API v2. Success is status code 302.
//
// On success, event **created** is emitted with
// `body` as well as the new `gist_id`.
Gist.prototype.create = function (data) {
  check_data(data)

  return xhr.call(this, api.create(data), {
    201: function (body, res) {
      var gist = /(\d+)/
      var location = res.headers.location
      var gist_id = null

      if (gist.test(location)) {
        gist_id = gist.exec(location)[0]
      }

      this.emit('created', body, gist_id)
    }.bind(this)
  })
}


module.exports = Gist
