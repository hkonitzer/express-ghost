"use strict";

const loggingFunction = require('debug');
const info = loggingFunction('ghostapi:app');
const debug = loggingFunction('ghostapi:debug');

const GhostContentAPI = require('@tryghost/content-api');

const GhostCacheContainer = function() {

    let tags = [];
    let cache = {};

    function clear() {
        tags = [];
        cache = {};
    }

    function set(tagName, object) {
        tags.push(tagName);
        cache[tagName] = object;
    }

    function get(tagName, limit) {
        if (cache[tagName]) {
            // always return a copy
            if (typeof limit === 'number')
                return cache[tagName].slice(0, limit);
            else
                return cache[tagName].slice(0);
        } else
            return null;
    }

    return {
        clear: clear,
        set: set,
        get: get
    }
};

const GhostCache = function() {
    let opt = {};
    let initialized = false;
    let ghostAPI;
    // cache container for posts
    const postsCache = new GhostCacheContainer();
    const pagesCache = new GhostCacheContainer();

    function init(apiOptions) {
        opt.url = apiOptions.url;
        opt.key = apiOptions.key;

        ghostAPI = new GhostContentAPI({
            url: opt.url,
            key: opt.key,
            version: 'v2'
        });
        initialized = true;
        //debug('ghost.js init - api configured: url=%s, key=%s', opt.url, opt.key);
    }

    function getPages(filterOption) {
        filterOption = filterOption || '';
        return ghostAPI.pages
            .browse({ limit: 50, include: 'tags', filter: filterOption})
    }

    function pages(options, force) {
        if (!initialized) return new Promise(function(resolve) { resolve([]); });
        force = force || false;
        options = options || {};
        let tagName;
        if (options.filter)
            tagName = options.filter.substring(5);
        else
            tagName = '*';
        debug(`Calling ghost to fetch pages with force-Parameter=${force} and tag=${tagName}`);
        if (force || pagesCache.get(tagName) === null) {
            return new Promise(function(resolve ,reject) {
                getPages(options.filter).then(function(pages) {
                    debug(`Serving ghost page data from api, fetched ${pages.length} pages`);
                    pagesCache.set(tagName, pages);
                    resolve(pagesCache.get(tagName, options.limit));
                }).catch(function(err) {
                    reject(err);
                });
            });
        } else {
            return new Promise(function(resolve) {
                debug(`Serving ghost pages data from cache`);
                resolve(pagesCache.get(tagName, options.limit));
            });
        }
    }

    function getPosts(filterOption) {
        filterOption = filterOption || '';
        return ghostAPI.posts
            .browse({ limit: 50, include: 'tags', filter: filterOption})
    }

    function posts(options, force) {
        if (!initialized) return new Promise(function(resolve) { resolve([]); });
        force = force || false;
        options = options || {};
        let tagName;
        if (options.filter)
            tagName = options.filter.substring(5);
        else
            tagName = '*';
        debug(`Calling ghost to fetch posts with force-Parameter=${force} and tag=${tagName}`);
        if (force || postsCache.get(tagName) === null) {
            return new Promise(function(resolve ,reject) {
                getPosts(options.filter).then(function(posts) {
                    debug(`Serving ghost post data from api, fetched ${posts.length} posts`);
                    postsCache.set(tagName, posts);
                    resolve(postsCache.get(tagName, options.limit));
                }).catch(function(err) {
                    reject(err);
                });
            });
        } else {
            return new Promise(function(resolve) {
                debug(`Serving ghost post data from cache`);
                resolve(postsCache.get(tagName, options.limit));
            });
        }
    }

    function getEmptryGhostObject() {
        return {
            posts: [],
            pages: []
        }
    }

    function postsMiddleware(req, res, next) {
        if (!res.locals.ghostdata) res.locals.ghostdata = getEmptryGhostObject();
        if (initialized) {
            // set filter for requested path
            let url = req.originalUrl;
            if (url === '/') {
                url = 'homepage'
            } else {
                url = url.substring(1);
            }
            let ghostParams = { limit: 5, filter: 'tags:'+ url };
            posts(ghostParams).then(function(obj) {
                res.locals.ghostdata.posts = obj;
                next();
            }).catch(function(err) {
                next(err);
            });
        } else {
            debug('Cannot call ghost API via postsMiddleware: API not initialized');
            next();
        }
    }

    function pagesMiddleware(req, res, next) {
        if (!res.locals.ghostdata) res.locals.ghostdata = getEmptryGhostObject();
        if (initialized) {
            // set filter for requested path
            let url = req.originalUrl;
            if (url === '/') {
                url = 'homepage'
            } else {
                url = url.substring(1);
            }
            let ghostParams = { limit: 5, filter: 'tags:'+ url };
            pages(ghostParams).then(function(obj) {
                res.locals.ghostdata.pages = obj;
                next();
            }).catch(function(err) {
                next(err);
            });
        } else {
            debug('Cannot call ghost API via pagesMiddleware: API not initialized');
            next();
        }
    }

    function purgeCache() {
        postsCache.clear();
        pagesCache.clear();
    }

    return {
        init: init,
        posts: posts,
        pages: pages,
        pagesMiddleware: pagesMiddleware,
        postsMiddleware: postsMiddleware,
        purge: purgeCache
    }


};

const ghostCache = new GhostCache();

module.exports = function(config) {
    if (config) {
        if (config.get && config.get('ghost') && config.get('ghost').enabled === true) {
            info(`Ghost config found, initialize with host ${config.get('ghost').url}`);
            ghostCache.init(config.get('ghost'));
        } else {
            debug('Could not find any ghost API crenditals in provided config');
        }
    }
    return ghostCache;
};