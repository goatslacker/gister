var response = require('./response');

function request(opts, cb) {
  var statusCode = 0;

  opts.method = opts.method || "GET";

  if (opts.uri.indexOf("gist.github.com") !== -1) {
    statusCode = 302;
  } else {
    statusCode = 200;
  }

  if (cb) {
    cb(null, {
      statusCode: statusCode,
      headers: {
        location: "https://gist.github.com/1"
      }
    }, response[opts.method.toLowerCase()]);
  }
}

module.exports = request;
