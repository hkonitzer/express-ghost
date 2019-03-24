# express-ghost
Simple Express middleware to fetch posts from the Ghost API and cache them into memory.

Currently only supports posts from the [ghost bloggin plattform](https://ghost.org/)

Tag your posts in ghost with your urls and the middleware fetches all posts with this tag
and provides them in the `res.locals` from Express.

For example, you have a page like www.myhomepage.org/aboutus.
So you have to tag your post with "aboutus". 

The only expection is the root: www.myhomepage.org/, to get your posts here you have to
tag them with "homepage".

## Configuration

This project uses [nconf](https://www.npmjs.com/package/nconf) under the hood to
get the needed credentials to access the ghost api.
To get the api credentials you have to provide an "Custom integration" 
in your ghost backend.

You can provide settings, e.g. in an json file, like 
```nconf.use('settings', { type: 'file', file: __dirname + '/myghostapisettings.json' });```
with the following credentials:

```
{
    "ghost": {
        "enabled": true,
        "url": "https://<my-ghost-host>",
        "key": "<my ghost api key>"
    }
}
```

In this case, the module initialized the ghost api as soon as the first import is made.
Otherwise you have to provide the url and key settings in the init function:
```
const ghostAPI = require('express-ghost');
ghostAPI.init({ url: "https://<my-ghost-host>", key: "<my ghost api key>" });
``` 

Beware, as long as you do not call init (or provide settings via nconf), 
the answer from the module is always empty.

## Usage

Install the middleware in your routes like this:
```
const express = require('express');
const router = express.Router();
const ghostAPI = require('express-ghost');

router.use(ghostAPI.postMiddleware);

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
```

Now you have access to an object in the [res.locals.ghostdata](https://expressjs.com/en/4x/api.html#res.locals)

You can use this in the templates, for example in EJS:
index-route.js:
```
const express = require('express');
const router = express.Router();
const ghostAPI = require('express-ghost');

router.use(ghostAPI.postMiddleware);

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express', ghostdata: res.locals.ghostdata });
});

module.exports = router;
```

template.ejs:
```
<% if (ghostdata && ghostdata.posts) {%>
    <% ghostdata.posts.forEach(function(post) { %>
        <h3><%=post.title</h3>
        <p><%-post.html%></p>
    <% }); %>
<% } %>
```

### Purging the cache

Call `ghostAPI.purge()`

Use the "force" parameter in `ghotsAPI.posts({}, true)`

You can provide an endpoint in your route definitions like this:

```
const express = require('express');
const router = express.Router();
const ghost = require('express-ghost');

router.get('/purgeghostcache', function (req, res) {
    ghost.posts({}, true).then(function(postsArray) {
        res.status(200).json({ posts: postsArray.length });
    }).catch(function(err) {
        res.status(500).json(err);
    });
});

module.exports = router;
```

Switch your route to POST an you can set up a [Ghost webhook](https://docs.ghost.org/api/webhooks/) 
to clear the cache if some of the content are changing (listen to event `site.changed`)
Beware: This example has some security implications: someone can DDOS your ghost api if
not properly secured. 

### Limitations

Only posts that are tagged with the matching urls (`res.originalURL`) are fetched.
The middleware gets only the latest 5 posts.
You can use the api direct with the `ghostAPI.posts({})` function to fetch more 
than 5 posts. The function takes the same paramerts and will provide an promise 
like the [Ghost Content-API](https://docs.ghost.org/api/javascript/content/).

### Logging

With [debug](https://www.npmjs.com/package/debug)
 