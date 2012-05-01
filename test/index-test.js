var vows = require('vows')
var assert = require('assert')

var response = require('./mock/response')
var request = require('./mock/request')

var Gist = require('../gister')

function newgist(id) {
  var gist = new Gist({
    gist_id: id,
    username: "octocat",
    token: "secret"
  })
  gist.request = request
  return gist
}

function wrap(cb) {
  return function () {
    cb.apply(cb, [null].concat(Array.prototype.slice.call(arguments, 0)))
  }
}

vows.describe("gister").addBatch({
  "when getting a gist": {

    "and not providing a gist id": {
      topic: function () {
        var gist = newgist()
        gist.on('error:gist_id', wrap(this.callback))
        gist.get()
      },

      "should receive an error": function (err) {
        assert.equal(err, 'No gist id provided')
      }
    },

    "by gist id": {
      topic: function () {
        var gist = newgist(1)
        gist.on('get', wrap(this.callback))
        gist.get()
      },

      "should return the body": function (topic) {
        assert.deepEqual(topic, response.get)
      }
    },

    "and an error is returned from request": {
      topic: function () {
        var gist = new Gist({ gist_id: 1 })
        gist.request = function (statusCode, cb) {
          cb(new Error(), { statusCode: 200, headers: {} }, {})
        }
        gist.on('err', wrap(this.callback))
        gist.get()
      },

      "should call error event": function (err) {
        assert.isTrue(err instanceof Error)
      }
    },

    "and the response statusCode is not found 404": {
      topic: function () {
        var gist = new Gist({ gist_id: 1 })
        gist.request = function (statusCode, cb) {
          cb(null, { statusCode: 404, headers: {} }, {})
        }
        gist.on('error:notfound', wrap(this.callback))
        gist.get()
      },

      "should call notfound event": function (err) {
        assert.isTrue(Boolean(err))
      }
    },

    "and the response statusCode is 201": {
      topic: function () {
        var gist = newgist()
        gist.request = function (statusCode, cb) {
          cb(null, { statusCode: 201, headers: {} }, {})
        }
        gist.on('created', wrap(this.callback))
        gist.create()
      },

      "should emit created event": function (err, body) {
        assert.isTrue(Boolean(body))
      }
    },

    "and the response statusCode is 500 internal server error": {
      topic: function () {
        var gist = new Gist({ gist_id: 1 })
        gist.request = function (statusCode, cb) {
          cb(null, { statusCode: 500, headers: {} }, {})
        }
        gist.on('err', wrap(this.callback))
        gist.get()
      },

      "should emit err event": function (err) {
        assert.isTrue(Boolean(err))
      }
    }
  },

  "when synchronizing the gist": {

    "and providing a gist id": {
      topic: function () {
        var gist = newgist(1)
        gist.on('updated', wrap(this.callback))
        gist.sync("contents of gist")
      },

      "should edit existing gist": function (topic) {
        assert.deepEqual(topic, response.patch)
      }
    },

    "with no gist id": {
      topic: function () {
        var gist = newgist()
        gist.on('created', wrap(this.callback))
        gist.sync("contents of gist")
      },

      "should create a new gist": function (err, topic, id) {
        assert.deepEqual(topic, response.post)
        assert.equal(id, "1")
      }
    }
  },

  "when editing a gist": {

    "and providing token and gist id": {
      topic: function () {
        var gist = newgist(1)
        gist.on('updated', wrap(this.callback))
        gist.edit("contents of gist")
      },

      "should receive a response": function (topic) {
        assert.deepEqual(topic, response.patch)
      }
    },

    "and not providing a gist id": {
      topic: function () {
        var gist = newgist()
        gist.on('error:gist_id', wrap(this.callback))
        gist.edit()
      },

      "should receive an error": function (err) {
        assert.equal(err, 'No gist id provided')
      }
    },

    "and providing a username but no password": {
      topic: function () {
        var gist = new Gist({ username: "octocat", gist_id: 1 })
        gist.request = request
        gist.on('error:credentials', wrap(this.callback))
        gist.edit("contents of gist")
      },

      "should receive an error": function (err) {
        assert.equal(err, 'No OAuth token or username and password provided')
      }
    },

    "without providing a username, just a password": {
      topic: function () {
        var gist = new Gist({ password: "secret", gist_id: 1 })
        gist.request = request
        gist.on('error:credentials', wrap(this.callback))
        gist.edit("contents of gist")
      },

      "should receive an error": function (err) {
        assert.equal(err, 'No OAuth token or username and password provided')
      }
    }
  },

  "when creating a new gist": {

    "and authenticated": {
      topic: function () {
        var gist = newgist()
        gist.on('created', wrap(this.callback))
        gist.create("contents of gist")
      },

      "should receive a response": function (topic) {
        assert.deepEqual(topic, response.post)
      }
    },

    "without providing a password": {
      topic: function () {
        var gist = new Gist({ username: "octocat" })
        gist.request = request
        gist.on('error:credentials', wrap(this.callback))
        gist.create("contents of gist")
      },

      "should receive an error": function (err) {
        assert.equal(err, 'No OAuth token or username and password provided')
      }
    },

    "providing just then token": {
      topic: function () {
        var gist = new Gist({ token: "abc123" })
        gist.request = request
        gist.on('created', wrap(this.callback))
        gist.create("contents of gist")
      },

      "should receive a response": function (topic) {
        assert.deepEqual(topic, response.post)
      }
    }
  }
}).export(module)
