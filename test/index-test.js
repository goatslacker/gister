var vows = require('vows');
var assert = require('assert');
var Gist = require('../gister');

var response = require('./mock/response');
var request = require('./mock/request');

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
  "when I get a gist": {

    "and I don't provide a gist id": {
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
    }
  },

  "when I synchronize the gist": {

    "and I provide a gist id": {
      topic: function () {
        var gist = newgist(1);
        gist.on('put', function (body) {
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
        gist.on('post', function (body, gist_id) {
          this.callback(body, gist_id);
        }.bind(this));
        gist.sync("contents of gist");
      },

      "should create a new gist": function (topic, id) {
        assert.deepEqual(topic, response.post);
        assert.equal(id, "1");
      }
    }
  }
}).export(module);
