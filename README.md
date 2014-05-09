Cached Resource
===============

An [AngularJS][angular] module to interact with RESTful server-side data
sources, even when the browser is offline. Uses HTML5
[localStorage][localStorage] under the hood.  Closely mimics the behavior of
the core [ngResource][ngResource] module, which it requires as a dependency.

[![Build Status][travis-badge]][travis-link]

## Features

* Provides a simple abstraction to retrieve and save objects from a RESTful
  server.
* Comes with a set of intelligent defaults that let you get started right away.
* Caches all requests, and returns them immediately from the cache if you
  request them again.
* Remmebers writes to the server, and adds them to the cache too.
* If a write fails, try it again periodically until it succeeds. (This even
  works if you refresh the page in between!)
* If you query for multiple resources in one request, each one is cached
  separately so you can request it from the cache individually, too.
* Works as a drop-in replacement for [Angular's $resource][ngResource] module.

----

## A simple example

```javascript
var Article = $cachedResource('article', '/articles/:id', {id: "@id"});

// GET requests:
var a1 = Article.get({id: 1});
a1.$promise.then(function() {
  console.log('From cache:', a1);
});
a1.$httpPromise.then(function() {
  console.log('From server:', a1);
});

// POST/PUT/PATCH/DELETE requests:
var a2 = new Article({id: 2});
a2.title = "This article will be saved eventually...";
a2.body = "Even if the browser is offline right now.";
a2.$save();
a2.$promise.then(function() {
  console.log('Article was successfully saved.');
});
```

Read the [tutorial on the Bites from Good Eggs
blog](http://bites.goodeggs.com/open_source/angular-cached-resource/).

-------

## Installing

**Bower:**

```bash
bower install angular-cached-resource
```

**npm:** (intended for use with [browserify](http://browserify.org/))

```bash
npm install angular-cached-resource
```

**Manual Download:**

- development: [angular-cached-resource.js](https://raw.githubusercontent.com/goodeggs/angular-cached-resource/master/angular-cached-resource.js)
- production: [angular-cached-resource.min.js](https://raw.githubusercontent.com/goodeggs/angular-cached-resource/master/angular-cached-resource.min.js)

---
## Usage
Provides a factory called `$cachedResource`:

```js
$cachedResource(cacheKey, url, [paramDefaults], [actions]);
```

### Arguments

- **cacheKey**, `String`<br>
  An arbitrary key that will uniquely represent this resource in localStorage.
  When the resource is instanciated, it will check localStorage for any

- **url**, `String`<br>
  Exactly matches the API for the `url` param of the [$resource][ngResource]
  factory.

- **paramDefaults**, `Object`, _(optional)_<br>
  Exactly matches the API for the `paramDefaults` param of the
  [$resource][ngResource] factory.

- **actions**, `Object`, _optional_<br>
  Exactly matches the API for the `actions` param of the
  [$resource][ngResource] factory.

### Returns

A CachedResource "class" object. This is a swap-in replacement for an object
created by the `$resource` factory, with the following additional properties:

- **Resource.$clearAll(** [options] **)**<br>
  Clears all items from the cache associated with this resource. Accepts the
  following argument:

  - **options**, `Object`, *optional*<br>
    For now, `options` accepts a single key, `exceptFor`, which will limit the
    resources that are cleared from the cache. `exceptFor` can be an `Array` or
    an `Object`. If it is an `Array`, the function will remove every cache item
    except for the ones whose keys match the provided keys. If it is an
    `Object`, the function will remove every cache item except for those
    returned by a query that matches the provided parameters.

In addition, the following properties exist on CachedResource "instance" objects:

- **resource.$promise**<br>
  For GET requests, if anything was already in the cache, this
  promise is immediately resolved (still asynchronously!) even as the HTTP request
  continues. Otherwise, this promise is resolved when the HTTP request responds.

- **resource.$httpPromise**<br>
  For all requests, this promise is resolved as soon as the
  corresponding HTTP request responds.

### Clearing the cache

Since there is a 5 megabyte limit on localStorage in most browsers, you'll
probably want to actively manage the resource instances that are stored. By
default, this module never removes cache entries, so you'll have to do this by
hand. Here are the ways that you can accomplish this:

- **[localStorage.clear()][localStorageClear]**<br>
  Removes everything in localStorage. This will not break the behavior of
  this module.

- **$cachedResource.clearAll()**<br>
  Removes every single Angular Cached Resource cache entry that's currently
  stored in localStorage. It will leave all cache entries that were not created
  by this module. (Note: cache entries are namespaced, so if you add anything
  to localStorage with a key that begins with `cachedResource://`, it will get
  deleted by this call).

- **$cachedResource.clearUndefined()**<br>
  Removes every Angular Cached Resource cache entry corresponding to a resource
  that has not been defined since the page was loaded. This is useful if your
  API changes and you want to make sure that old entries are cleared away.

- **$cachedResource.clearAll({exceptFor: ['foo', 'bar']})**<br>
  Removes every Angular Cached Resource entry except for resources with the
  `foo` or `bar` keys.

If you have a "class" object that you've created with `$cachedResource`, then
you can also do the following:

- **CachedResource.$clearAll()**<br>
  Removes all entries from the cache associated with this particular resource
  class.

- **CachedResource.$clearAll({exceptFor: [{id: 1}])**<br>
  Removes all entries from the cache associated with this particular resource
  class, except for those with an `id` of 1.  (This assumes that
  `paramDefaults` has an `id` param.)

- **CachedResource.$clearAll({exceptFor: {query: 'search string'}})**<br>
  Removes all entries from the cache except those that were returned by the
  provided query parameters.

------

## Details

**Asking for a cached resource with `get` or `query` will do the following:**

1. If the request has not been made previously, it will immediately return a
   `resource` object, just like usual. The request will go through to the
   server, and when the server responds, the resource will be saved in a
   localStorage cache.

2. If the request has already been made, it will immediately return a
   `resource` object that is pre-populated from the cache. The request will
   still attempt to go through to the server, and if the server responds, the
   cache entry will be updated.

**Updating a CachedResource object will do the following:**

1. Add the resource update action to a queue.
2. Immediately attempt to flush the queue by sending all the network requests
   in the queue.
3. If a queued network request succeeds, remove it from the queue and resolve
   the promises on the associated resources (only if the queue entry was made
   after the page was loaded)
4. If the queue contains requests, attempt to flush it once per minute OR
   whenever the browser sends a [navigator.onOnline][onOnline] event.

**What if localStorage doesn't exist, or if the browser is out of space?**

In either of these cases, `$cachedResource` will make sure all of your requests
still happen.  Things end up working just like the `$resource` module, with
none of the caching benefits.

------

## Development

Please make sure you run the tests, and add to them unless it's a trivial
change. Here is how you can run the tests:

```
npm install
npm test
```

------

## License

[MIT](https://github.com/goodeggs/angular-cached-resource/blob/master/LICENSE.md)

[travis-badge]: https://travis-ci.org/goodeggs/angular-cached-resource.png
[travis-link]: https://travis-ci.org/goodeggs/angular-cached-resource

[angular]: http://angularjs.org/
[ngResource]: http://docs.angularjs.org/api/ngResource/service/$resource
[localStorage]: http://www.w3.org/TR/webstorage/#the-localstorage-attribute
[localStorageClear]: http://www.w3.org/TR/webstorage/#dom-storage-clear
[onOnline]: https://developer.mozilla.org/en-US/docs/Web/API/NavigatorOnLine.onLine
