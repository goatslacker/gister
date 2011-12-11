var response = require('./response');

function request(opts, data, cb) {
  var statusCode = 0;

  if (data) {
    if (!this.username || !this.token) {
      return this.emit("error:credentials");
    }

    opts.form = {
      login: this.username,
      token: this.token,
      "file_contents[gistfile1json]": data
    };
  }

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
