var vows = require('vows');
var assert = require('assert');

var response = require('./mock/response');
var request = require('./mock/request');

var Gist = require((process.argv[3]
  && process.argv[3].indexOf("--cover") !== -1) ?
  '../jscoverage/gister' : '../gister');

function newgist(id) {
  var gist = new Gist({
    gist_id: id,
    username: "octocat",
    token: "secret"
  });
  gist.request = request;
  return gist;
}

vows.describe("gister").addBatch({
  "when getting a gist": {

    "and not providing a gist id": {
      topic: function () {
        var gist = newgist();
        gist.on('error:gist_id', this.callback);
        gist.get();
      },

      "should receive an error": function () {
        // the test will pass if this event is emitted
      }
    },

    "by gist id": {
      topic: function () {
        var gist = newgist(1);
        gist.on('get', function (body) {
          this.callback(null, body);
        }.bind(this));
        gist.get();
      },

      "should return the body": function (topic) {
        assert.deepEqual(topic, response.get);
      }
    },

    "and an error is returned from request": {
      topic: function () {
        var gist = new Gist({ gist_id: 1 });
        gist.request = function (statusCode, cb) {
          cb(new Error(), { statusCode: 200 }, {});
        };
        this.callback(null, gist);
      },

      "should raise an exception": function (gist) {
        function err() {
          gist.get();
        }
        assert.throws(err, Error);
      }
    },

    "and the response statusCode is not 200 OK": {
      topic: function () {
        var gist = new Gist({ gist_id: 1 });
        gist.request = function (statusCode, cb) {
          cb(null, { statusCode: 404 }, {});
        };
        this.callback(null, gist);
      },

      "should raise an exception": function (gist) {
        function err() {
          gist.get();
        }
        assert.throws(err, Error);
      }
    }
  },

  "when synchronizing the gist": {

    "and providing a gist id": {
      topic: function () {
        var gist = newgist(1);
        gist.on('updated', function (body) {
          this.callback(null, body);
        }.bind(this));
        gist.sync("contents of gist");
      },

      "should edit existing gist": function (topic) {
        assert.deepEqual(topic, response.put);
      }
    },

    "with no gist id": {
      topic: function () {
        var gist = newgist();
        gist.on('created', this.callback);
        gist.sync("contents of gist");
      },

      "should create a new gist": function (topic, id) {
        assert.deepEqual(topic, response.post);
        assert.equal(id, "1");
      }
    }
  },

  "when editing a gist": {

    "and providing token, username and gist id": {
      topic: function () {
        var gist = newgist(1);
        gist.on('updated', function (body) {
          this.callback(null, body);
        }.bind(this));
        gist.edit("contents of gist");
      },

      "should receive a response": function (topic) {
        assert.deepEqual(topic, response.put);
      }
    },

    "and not providing a gist id": {
      topic: function () {
        var gist = newgist();
        gist.on('error:gist_id', this.callback);
        gist.edit();
      },

      "should receive an error": function () {
        // the test will pass if this event is emitted
      }
    },

    "without providing a token": {
      topic: function () {
        var gist = new Gist({ username: "octocat", gist_id: 1 });
        gist.request = request;
        gist.on('error:credentials', this.callback);
        gist.edit("contents of gist");
      },

      "should receive an error": function () {
        // the test will pass if this event is emitted
      }
    },

    "without providing a username": {
      topic: function () {
        var gist = new Gist({ token: "abc123", gist_id: 1 });
        gist.request = request;
        gist.on('error:credentials', this.callback);
        gist.edit("contents of gist");
      },

      "should receive an error": function () {
        // the test will pass if this event is emitted
      }
    }
  },

  "when creating a new gist": {

    "and authenticated": {
      topic: function () {
        var gist = newgist();
        gist.on('created', function (body) {
          this.callback(null, body);
        }.bind(this));
        gist.create("contents of gist");
      },

      "should receive a response": function (topic) {
        assert.deepEqual(topic, response.post);
      }
    },

    "without providing a token": {
      topic: function () {
        var gist = new Gist({ username: "octocat" });
        gist.request = request;
        gist.on('error:credentials', this.callback);
        gist.create("contents of gist");
      },

      "should receive an error": function () {
        // the test will pass if this event is emitted
      }
    },

    "without providing a username": {
      topic: function () {
        var gist = new Gist({ token: "abc123" });
        gist.request = request;
        gist.on('error:credentials', this.callback);
        gist.create("contents of gist");
      },

      "should receive an error": function () {
        // the test will pass if this event is emitted
      }
    }
  }
}).export(module);
