# gister

[![Build Status](https://secure.travis-ci.org/goatslacker/gister.png)](http://travis-ci.org/goatslacker/gister)

node.js module for gist.github.com -- edit, create, and retrieve gists.

## The Basics

`gister` is a way to create, edit and retrieve gists programatically.

### Install npm

Inside your project's directory

    npm install gister

### require it

    var Gister = require('gister');

### Create the object

    var gist = new Gister({
      username: "octocat",
      token: "secret"
    });

### Events

gister will emit events back at you.

Each event takes a callback as it's second parameter.

    gist.on('error:credentials');       // Missing credentials
    gist.on('error:notfound');          // gist was not found
    gist.on('err');                     // General purpose errors
    gist.on('error:gist_id');           // You did not provide a gist_id
    gist.on('get');                     // The data from the gist you retrieved
    gist.on('updated');                 // The response from GitHub when a gist is updated
    gist.on('created');                 // Response after a gist has been created

### Creating a gist

    gist.create("Hello World", "name of my gist");

### Editing a gist

    gist.edit("New Content", "name of my gist");

### Retrieiving a gist

    gist.gist_id = 101210;
    gist.get("name of my gist");        // name of your gist is optional. If added only that 'file' will be retrieved.

### More?

[Read annotated source](http://goatslacker.github.com/gister)
