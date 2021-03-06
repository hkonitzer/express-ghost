# express-ghost
Simple Express middleware to fetch posts from the Ghost API and cache them into memory.

Use the [ghost blogging plattform](https://ghost.org/) as headless CMS for your express 
powered website.
Currently only supports posts and pages from the ghost api. 

Tag your posts or pages in ghost with your urls and the middleware fetches all posts 
with this tag and provides them in the `res.locals` from Express.

For example, you have a page like www.myhomepage.org/aboutus.
So you have to tag your post (or page) with "aboutus". 

The only expection is the root: www.myhomepage.org/, to get your posts here you have to
tag them with "homepage".

## Configuration

This project uses [nconf](https://www.npmjs.com/package/nconf) under the hood to
get the needed credentials to access the ghost api.
To get the api credentials you have to provide an "Custom integration" configuration
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

In this case, the module initialized the ghost api as soon as the first import 
with config object given is made:
`const ghostAPI = require('express-ghost')(config);`

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
const ghostAPI = require('express-ghost')();

router.use(ghostAPI.postsMiddleware);

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
```
If you wish to fetch the pages instead, replace the paremter for the use-function with `router.use(ghostAPI.pagesMiddleware);`.
Of course you can use both middlewares.
Now you have access to an object in the [res.locals.ghostdata](https://expressjs.com/en/4x/api.html#res.locals)

You can use this in your templates, for example with EJS:
index-route.js:
```
const express = require('express');
const router = express.Router();
const ghostAPI = require('express-ghost')();

router.use(ghostAPI.postsMiddleware);

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
The pages array can be accessed under `ghostdata.pages`.

### Purging the cache

Call `ghostAPI.purge()`

Use the "force" parameter in `ghotsAPI.posts({}, true)`

You can provide an endpoint in your route definitions like this:

```
const express = require('express');
const router = express.Router();
const ghost = require('express-ghost');

router.get('/purgeghostcache', function (req, res) {
    ghost.purge();
    res.status(200).json({ pruge: true });
});

module.exports = router;
```

Switch your route to POST an you can set up a [Ghost webhook](https://docs.ghost.org/api/webhooks/) 
to clear the cache if some of the content are changing (listen to event `site.changed`)
Beware: This example has some security implications: someone can DDOS your ghost api if
not properly secured.

### Manipulate the ghost html response

The ghost html reponses contains already classes (and elements) for special content items like galleries
(like `class="kg-gallery-card"`). If you want to get rid of them or replace them with your own (class-) attributes you
can provide a parser- (actually filter-) function.

The javascript function has to to accept a string (as first argument) and to return a string.
Second argument is optional and can be a tag name, as the function is only executed on posts/pages for the given tag.

Simple use case (in this example no parsing/filtering, just logging):

index-route.js:
```
const express = require('express');
const router = express.Router();
const ghostAPI = require('express-ghost')();

router.use(ghostAPI.postsMiddleware);
const logGhostHTMLResponse = function(htmlString) {
    console.log('PARSING: ', htmlString);
    return htmlString;
};
ghost.setPostHTMLParser(logGhostHTMLResponse);

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express', ghostdata: res.locals.ghostdata });
});

module.exports = router;
```

### Limitations

Only posts that are tagged with the matching urls (`res.originalURL`) are fetched.
The middleware gets only the latest 10 posts.
You can use the api direct with the `ghostAPI.posts({})` or `ghostAPI.pages({})` 
function to fetch more than 10 posts/pages. The function takes the same parameters
and will provide an promise like the [Ghost Content-API](https://docs.ghost.org/api/javascript/content/).

#### Long URLs with slashes

Long URLs like /aboutus/team can be used, but you have to replaced the / sign with -.
Example: Instead a tag of "abouts/team", the tag must be named "aboutus-team".

### Logging

With [debug](https://www.npmjs.com/package/debug), prefix is: "ghostapi:"
 