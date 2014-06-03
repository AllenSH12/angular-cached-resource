(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Generated by CoffeeScript 1.7.1
var LOCAL_STORAGE_PREFIX, buildKey, cacheKeyHasPrefix, localStorage, memoryCache;

LOCAL_STORAGE_PREFIX = 'cachedResource://';

localStorage = window.localStorage;

memoryCache = {};

buildKey = function(key) {
  return "" + LOCAL_STORAGE_PREFIX + key;
};

cacheKeyHasPrefix = function(cacheKey, prefix) {
  var index, nextChar;
  if (prefix == null) {
    return cacheKey.indexOf(LOCAL_STORAGE_PREFIX) === 0;
  }
  prefix = buildKey(prefix);
  index = cacheKey.indexOf(prefix);
  nextChar = cacheKey[prefix.length];
  return index === 0 && ((nextChar == null) || (nextChar === '?' || nextChar === '/'));
};

module.exports = function(debug) {
  return {
    getItem: function(key, fallbackValue) {
      var item, out;
      key = buildKey(key);
      item = memoryCache[key];
      if (item == null) {
        item = localStorage.getItem(key);
      }
      out = item != null ? angular.fromJson(item) : fallbackValue;
      debug("CACHE GET: " + key, out);
      return out;
    },
    setItem: function(key, value) {
      var stringValue;
      key = buildKey(key);
      stringValue = angular.toJson(value);
      try {
        localStorage.setItem(key, stringValue);
        if (memoryCache[key] != null) {
          delete memoryCache[key];
        }
      } catch (_error) {
        memoryCache[key] = stringValue;
      }
      debug("CACHE PUT: " + key, angular.fromJson(angular.toJson(value)));
      return value;
    },
    clear: function(_arg) {
      var cacheKey, cacheKeys, exceptFor, exception, i, key, skipKey, _i, _j, _k, _len, _len1, _ref, _ref1, _results;
      _ref = _arg != null ? _arg : {}, key = _ref.key, exceptFor = _ref.exceptFor;
      if (exceptFor == null) {
        exceptFor = [];
      }
      cacheKeys = [];
      for (i = _i = 0, _ref1 = localStorage.length; 0 <= _ref1 ? _i < _ref1 : _i > _ref1; i = 0 <= _ref1 ? ++_i : --_i) {
        cacheKey = localStorage.key(i);
        if (!cacheKeyHasPrefix(cacheKey, key)) {
          continue;
        }
        skipKey = false;
        for (_j = 0, _len = exceptFor.length; _j < _len; _j++) {
          exception = exceptFor[_j];
          if (!(cacheKeyHasPrefix(cacheKey, exception))) {
            continue;
          }
          skipKey = true;
          break;
        }
        if (skipKey) {
          continue;
        }
        cacheKeys.push(cacheKey);
      }
      _results = [];
      for (_k = 0, _len1 = cacheKeys.length; _k < _len1; _k++) {
        cacheKey = cacheKeys[_k];
        _results.push(localStorage.removeItem(cacheKey));
      }
      return _results;
    }
  };
};

},{}],2:[function(require,module,exports){
// Generated by CoffeeScript 1.7.1
module.exports = function(debug) {
  var CachedResourceManager, ResourceWriteQueue;
  ResourceWriteQueue = require('./resource_write_queue')(debug);
  return CachedResourceManager = (function() {
    function CachedResourceManager($timeout) {
      this.$timeout = $timeout;
      this.queuesByKey = {};
    }

    CachedResourceManager.prototype.keys = function() {
      return Object.keys(this.queuesByKey);
    };

    CachedResourceManager.prototype.add = function(CachedResource) {
      return this.queuesByKey[CachedResource.$key] = new ResourceWriteQueue(CachedResource, this.$timeout);
    };

    CachedResourceManager.prototype.getQueue = function(CachedResource) {
      return this.queuesByKey[CachedResource.$key];
    };

    CachedResourceManager.prototype.flushQueues = function() {
      var key, queue, _ref, _results;
      _ref = this.queuesByKey;
      _results = [];
      for (key in _ref) {
        queue = _ref[key];
        _results.push(queue.flush());
      }
      return _results;
    };

    return CachedResourceManager;

  })();
};

},{"./resource_write_queue":6}],3:[function(require,module,exports){
// Generated by CoffeeScript 1.7.1
var $cachedResourceFactory, $cachedResourceProvider, DEFAULT_ACTIONS, app, resourceManagerListener,
  __slice = [].slice;

DEFAULT_ACTIONS = {
  get: {
    method: 'GET'
  },
  query: {
    method: 'GET',
    isArray: true
  },
  save: {
    method: 'POST'
  },
  remove: {
    method: 'DELETE'
  },
  "delete": {
    method: 'DELETE'
  }
};

resourceManagerListener = null;

if (typeof module !== "undefined" && module !== null) {
  module.exports = app = angular.module('ngCachedResource', ['ngResource']);
}

app.provider('$cachedResource', $cachedResourceProvider = (function() {
  function $cachedResourceProvider() {
    this.debugMode = false;
    this.$get = $cachedResourceFactory;
  }

  $cachedResourceProvider.prototype.setDebugMode = function(debugMode) {
    this.debugMode = debugMode != null ? debugMode : true;
  };

  return $cachedResourceProvider;

})());

$cachedResourceFactory = [
  '$resource', '$timeout', '$q', '$log', function($resource, $timeout, $q, $log) {
    var $cachedResource, CachedResourceManager, ResourceCacheArrayEntry, ResourceCacheEntry, cache, debug, modifyObjectInPlace, processReadArgs, readArrayCache, readCache, resourceManager, writeCache;
    debug = $cachedResourceProvider.debugMode != null ? $log.debug.bind($log, 'ngCachedResource') : (function() {});
    ResourceCacheEntry = require('./resource_cache_entry')(debug);
    ResourceCacheArrayEntry = require('./resource_cache_array_entry')(debug);
    CachedResourceManager = require('./cached_resource_manager')(debug);
    cache = require('./cache')(debug);
    resourceManager = new CachedResourceManager($timeout);
    if (resourceManagerListener) {
      document.removeEventListener('online', resourceManagerListener);
    }
    resourceManagerListener = function(event) {
      return resourceManager.flushQueues();
    };
    document.addEventListener('online', resourceManagerListener);
    processReadArgs = function(args) {
      var deferred, error, params, success;
      args = Array.prototype.slice.call(args);
      params = angular.isObject(args[0]) ? args.shift() : {};
      success = args[0], error = args[1];
      deferred = $q.defer();
      if (angular.isFunction(success)) {
        deferred.promise.then(success);
      }
      if (angular.isFunction(error)) {
        deferred.promise["catch"](error);
      }
      return {
        params: params,
        deferred: deferred
      };
    };
    modifyObjectInPlace = function(oldObject, newObject) {
      var key, _i, _j, _len, _len1, _ref, _ref1, _results;
      _ref = Object.keys(oldObject);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        key = _ref[_i];
        if (key[0] !== '$') {
          if (newObject[key] == null) {
            delete oldObject[key];
          }
        }
      }
      _ref1 = Object.keys(newObject);
      _results = [];
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        key = _ref1[_j];
        if (key[0] !== '$') {
          if (angular.isObject(oldObject[key]) && angular.isObject(newObject[key])) {
            _results.push(modifyObjectInPlace(oldObject[key], newObject[key]));
          } else if (!angular.equals(oldObject[key], newObject[key])) {
            _results.push(oldObject[key] = newObject[key]);
          } else {
            _results.push(void 0);
          }
        }
      }
      return _results;
    };
    readArrayCache = function(name, CachedResource) {
      return function() {
        var arrayInstance, cacheArrayEntry, cacheDeferred, cacheInstanceEntry, cacheInstanceParams, httpDeferred, params, resource, _i, _len, _ref, _ref1;
        _ref = processReadArgs(arguments), params = _ref.params, cacheDeferred = _ref.deferred;
        httpDeferred = $q.defer();
        arrayInstance = new Array();
        arrayInstance.$promise = cacheDeferred.promise;
        arrayInstance.$httpPromise = httpDeferred.promise;
        cacheArrayEntry = new ResourceCacheArrayEntry(CachedResource.$key, params).load();
        resource = CachedResource.$resource[name](params);
        resource.$promise.then(function() {
          var cachedResourceInstances;
          cachedResourceInstances = resource.map(function(resourceInstance) {
            return new CachedResource(resourceInstance);
          });
          arrayInstance.splice.apply(arrayInstance, [0, arrayInstance.length].concat(__slice.call(cachedResourceInstances)));
          if (!cacheArrayEntry.value) {
            cacheDeferred.resolve(arrayInstance);
          }
          return httpDeferred.resolve(arrayInstance);
        });
        resource.$promise["catch"](function(error) {
          if (!cacheArrayEntry.value) {
            cacheDeferred.reject(error);
          }
          return httpDeferred.reject(error);
        });
        arrayInstance.$httpPromise.then(function(response) {
          var cacheArrayReferences, cacheInstanceEntry, cacheInstanceParams, instance, _i, _len;
          cacheArrayReferences = [];
          for (_i = 0, _len = response.length; _i < _len; _i++) {
            instance = response[_i];
            cacheInstanceParams = instance.$params();
            if (Object.keys(cacheInstanceParams).length === 0) {
              $log.error("instance " + instance + " doesn't have any boundParams. Please, make sure you specified them in your resource's initialization, f.e. `{id: \"@id\"}`, or it won't be cached.");
            } else {
              cacheArrayReferences.push(cacheInstanceParams);
              cacheInstanceEntry = new ResourceCacheEntry(CachedResource.$key, cacheInstanceParams).load();
              cacheInstanceEntry.set(instance, false);
            }
          }
          return cacheArrayEntry.set(cacheArrayReferences);
        });
        if (cacheArrayEntry.value) {
          _ref1 = cacheArrayEntry.value;
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            cacheInstanceParams = _ref1[_i];
            cacheInstanceEntry = new ResourceCacheEntry(CachedResource.$key, cacheInstanceParams).load();
            arrayInstance.push(new CachedResource(cacheInstanceEntry.value));
          }
          cacheDeferred.resolve(arrayInstance);
        }
        return arrayInstance;
      };
    };
    readCache = function(name, CachedResource) {
      return function() {
        var cacheDeferred, cacheEntry, httpDeferred, instance, params, readHttp, _ref;
        _ref = processReadArgs(arguments), params = _ref.params, cacheDeferred = _ref.deferred;
        httpDeferred = $q.defer();
        instance = new CachedResource({
          $promise: cacheDeferred.promise,
          $httpPromise: httpDeferred.promise
        });
        cacheEntry = new ResourceCacheEntry(CachedResource.$key, params).load();
        readHttp = function() {
          var resource;
          resource = CachedResource.$resource[name].call(CachedResource.$resource, params);
          resource.$promise.then(function(response) {
            angular.extend(instance, response);
            if (!cacheEntry.value) {
              cacheDeferred.resolve(instance);
            }
            httpDeferred.resolve(instance);
            return cacheEntry.set(response, false);
          });
          return resource.$promise["catch"](function(error) {
            if (!cacheEntry.value) {
              cacheDeferred.reject(error);
            }
            return httpDeferred.reject(error);
          });
        };
        if (cacheEntry.dirty) {
          resourceManager.getQueue(CachedResource).processResource(params, readHttp);
        } else {
          readHttp();
        }
        if (cacheEntry.value) {
          angular.extend(instance, cacheEntry.value);
          cacheDeferred.resolve(instance);
        }
        return instance;
      };
    };
    writeCache = function(action, CachedResource) {
      return function() {
        var args, cacheEntry, data, deferred, error, instanceMethod, isArray, param, params, queue, queueDeferred, resource, success, value, wrapInCachedResource, _i, _len, _ref;
        instanceMethod = this instanceof CachedResource;
        args = Array.prototype.slice.call(arguments);
        params = !instanceMethod && angular.isObject(args[1]) ? args.shift() : instanceMethod && angular.isObject(args[0]) ? args.shift() : {};
        data = instanceMethod ? this : args.shift();
        success = args[0], error = args[1];
        isArray = angular.isArray(data);
        wrapInCachedResource = function(object) {
          if (object instanceof CachedResource) {
            return object;
          } else {
            return new CachedResource(object);
          }
        };
        if (isArray) {
          data = data.map(function(o) {
            return wrapInCachedResource(o);
          });
          for (_i = 0, _len = data.length; _i < _len; _i++) {
            resource = data[_i];
            cacheEntry = new ResourceCacheEntry(CachedResource.$key, resource.$params()).load();
            if (!angular.equals(cacheEntry.data, resource)) {
              cacheEntry.set(resource, true);
            }
          }
        } else {
          data = wrapInCachedResource(data);
          _ref = data.$params();
          for (param in _ref) {
            value = _ref[param];
            params[param] = value;
          }
          cacheEntry = new ResourceCacheEntry(CachedResource.$key, data.$params()).load();
          if (!angular.equals(cacheEntry.data, data)) {
            cacheEntry.set(data, true);
          }
        }
        data.$resolved = false;
        deferred = $q.defer();
        data.$promise = deferred.promise;
        if (angular.isFunction(success)) {
          deferred.promise.then(success);
        }
        if (angular.isFunction(error)) {
          deferred.promise["catch"](error);
        }
        queueDeferred = $q.defer();
        queueDeferred.promise.then(function(httpResource) {
          modifyObjectInPlace(data, httpResource);
          data.$resolved = true;
          return deferred.resolve(data);
        });
        queueDeferred.promise["catch"](deferred.reject);
        queue = resourceManager.getQueue(CachedResource);
        queue.enqueue(params, data, action, queueDeferred);
        queue.flush();
        return data;
      };
    };
    $cachedResource = function() {
      var $key, CachedResource, Resource, actions, arg, args, boundParams, handler, isPermissibleBoundValue, name, param, paramDefault, paramDefaults, params, url, _ref;
      args = Array.prototype.slice.call(arguments);
      $key = args.shift();
      url = args.shift();
      while (args.length) {
        arg = args.pop();
        if (angular.isObject(arg[Object.keys(arg)[0]])) {
          actions = arg;
        } else {
          paramDefaults = arg;
        }
      }
      actions = angular.extend({}, DEFAULT_ACTIONS, actions);
      if (paramDefaults == null) {
        paramDefaults = {};
      }
      boundParams = {};
      for (param in paramDefaults) {
        paramDefault = paramDefaults[param];
        if (paramDefault[0] === '@') {
          boundParams[paramDefault.substr(1)] = param;
        }
      }
      Resource = $resource.call(null, url, paramDefaults, actions);
      isPermissibleBoundValue = function(value) {
        return angular.isDate(value) || angular.isNumber(value) || angular.isString(value);
      };
      CachedResource = (function() {
        CachedResource.prototype.$cache = true;

        function CachedResource(attrs) {
          angular.extend(this, attrs);
        }

        CachedResource.prototype.$params = function() {
          var attribute, params;
          params = {};
          for (attribute in boundParams) {
            param = boundParams[attribute];
            if (isPermissibleBoundValue(this[attribute])) {
              params[param] = this[attribute];
            }
          }
          return params;
        };

        CachedResource.prototype.$$addToCache = function() {
          var entry;
          entry = new ResourceCacheEntry($key, this.$params());
          entry.set(this, true);
          return this;
        };

        CachedResource.$clearAll = function(_arg) {
          var cacheArrayEntry, cacheInstanceParams, exceptFor, _i, _len, _ref;
          exceptFor = (_arg != null ? _arg : {}).exceptFor;
          if (angular.isArray(exceptFor)) {
            exceptFor = exceptFor.map(function(params) {
              var resource;
              resource = new CachedResource(params);
              return new ResourceCacheEntry($key, resource.$params()).key;
            });
          } else if (angular.isObject(exceptFor)) {
            cacheArrayEntry = new ResourceCacheArrayEntry($key, exceptFor).load();
            exceptFor = [];
            exceptFor.push(cacheArrayEntry.key);
            if (cacheArrayEntry.value) {
              _ref = cacheArrayEntry.value;
              for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                cacheInstanceParams = _ref[_i];
                exceptFor.push(new ResourceCacheEntry($key, cacheInstanceParams).key);
              }
            }
          }
          return cache.clear({
            key: $key,
            exceptFor: exceptFor
          });
        };

        CachedResource.$addToCache = function(attrs) {
          return new CachedResource(attrs).$$addToCache();
        };

        CachedResource.$resource = Resource;

        CachedResource.$key = $key;

        return CachedResource;

      })();
      for (name in actions) {
        params = actions[name];
        handler = params.method === 'GET' && params.isArray ? readArrayCache(name, CachedResource) : params.method === 'GET' ? readCache(name, CachedResource) : (_ref = params.method) === 'POST' || _ref === 'PUT' || _ref === 'DELETE' || _ref === 'PATCH' ? writeCache(name, CachedResource) : void 0;
        CachedResource[name] = handler;
        if (params.method !== 'GET') {
          CachedResource.prototype["$" + name] = handler;
        }
      }
      resourceManager.add(CachedResource);
      resourceManager.flushQueues();
      return CachedResource;
    };
    $cachedResource.clearAll = cache.clear;
    $cachedResource.clearUndefined = function() {
      return cache.clear({
        exceptFor: resourceManager.keys()
      });
    };
    return $cachedResource;
  }
];

},{"./cache":1,"./cached_resource_manager":2,"./resource_cache_array_entry":4,"./resource_cache_entry":5}],4:[function(require,module,exports){
// Generated by CoffeeScript 1.7.1
var __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

module.exports = function(debug) {
  var ResourceCacheArrayEntry, ResourceCacheEntry;
  ResourceCacheEntry = require('./resource_cache_entry')(debug);
  return ResourceCacheArrayEntry = (function(_super) {
    __extends(ResourceCacheArrayEntry, _super);

    function ResourceCacheArrayEntry() {
      return ResourceCacheArrayEntry.__super__.constructor.apply(this, arguments);
    }

    ResourceCacheArrayEntry.prototype.defaultValue = [];

    ResourceCacheArrayEntry.prototype.setKey = function(key) {
      return this.key = "" + key + "/array";
    };

    return ResourceCacheArrayEntry;

  })(ResourceCacheEntry);
};

},{"./resource_cache_entry":5}],5:[function(require,module,exports){
// Generated by CoffeeScript 1.7.1
module.exports = function(debug) {
  var Cache, ResourceCacheEntry;
  Cache = require('./cache')(debug);
  return ResourceCacheEntry = (function() {
    ResourceCacheEntry.prototype.defaultValue = {};

    function ResourceCacheEntry(resourceKey, params) {
      var param, paramKeys;
      this.setKey(resourceKey);
      paramKeys = angular.isObject(params) ? Object.keys(params).sort() : [];
      if (paramKeys.length) {
        this.key += '?' + ((function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = paramKeys.length; _i < _len; _i++) {
            param = paramKeys[_i];
            _results.push("" + param + "=" + params[param]);
          }
          return _results;
        })()).join('&');
      }
    }

    ResourceCacheEntry.prototype.load = function() {
      var _ref;
      _ref = Cache.getItem(this.key, this.defaultValue), this.value = _ref.value, this.dirty = _ref.dirty;
      return this;
    };

    ResourceCacheEntry.prototype.setKey = function(key) {
      this.key = key;
    };

    ResourceCacheEntry.prototype.set = function(value, dirty) {
      this.value = value;
      this.dirty = dirty;
      return this._update();
    };

    ResourceCacheEntry.prototype.setClean = function() {
      this.dirty = false;
      return this._update();
    };

    ResourceCacheEntry.prototype._update = function() {
      return Cache.setItem(this.key, {
        value: this.value,
        dirty: this.dirty
      });
    };

    return ResourceCacheEntry;

  })();
};

},{"./cache":1}],6:[function(require,module,exports){
// Generated by CoffeeScript 1.7.1
var CACHE_RETRY_TIMEOUT;

CACHE_RETRY_TIMEOUT = 60000;

module.exports = function(debug) {
  var Cache, ResourceCacheEntry, ResourceWriteQueue;
  ResourceCacheEntry = require('./resource_cache_entry')(debug);
  Cache = require('./cache')(debug);
  return ResourceWriteQueue = (function() {
    ResourceWriteQueue.prototype.logStatusOfRequest = function(status, action, params, data) {
      return debug("ngCachedResource", "" + action + " for " + this.key + " " + (angular.toJson(params)) + " " + status, data);
    };

    function ResourceWriteQueue(CachedResource, $timeout) {
      this.CachedResource = CachedResource;
      this.$timeout = $timeout;
      this.key = "" + this.CachedResource.$key + "/write";
      this.queue = Cache.getItem(this.key, []);
    }

    ResourceWriteQueue.prototype.enqueue = function(params, resourceData, action, deferred) {
      var resourceParams, write, _ref, _ref1;
      this.logStatusOfRequest('enqueued', action, params, resourceData);
      resourceParams = angular.isArray(resourceData) ? resourceData.map(function(resource) {
        return resource.$params();
      }) : resourceData.$params();
      write = this.findWrite({
        params: params,
        action: action
      });
      if (write == null) {
        this.queue.push({
          params: params,
          resourceParams: resourceParams,
          action: action,
          deferred: deferred
        });
        return this._update();
      } else {
        if ((_ref = write.deferred) != null) {
          _ref.promise.then(function(response) {
            return deferred.resolve(response);
          });
        }
        return (_ref1 = write.deferred) != null ? _ref1.promise["catch"](function(error) {
          return deferred.reject(error);
        }) : void 0;
      }
    };

    ResourceWriteQueue.prototype.findWrite = function(_arg) {
      var action, params, write, _i, _len, _ref;
      action = _arg.action, params = _arg.params;
      _ref = this.queue;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        write = _ref[_i];
        if (action === write.action && angular.equals(params, write.params)) {
          return write;
        }
      }
    };

    ResourceWriteQueue.prototype.removeWrite = function(_arg) {
      var action, entry, newQueue, params, _i, _len, _ref;
      action = _arg.action, params = _arg.params;
      newQueue = [];
      _ref = this.queue;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        entry = _ref[_i];
        if (!(action === entry.action && angular.equals(params, entry.params))) {
          newQueue.push(entry);
        }
      }
      this.queue = newQueue;
      if (this.queue.length === 0 && this.timeoutPromise) {
        this.$timeout.cancel(this.timeoutPromise);
        delete this.timeoutPromise;
      }
      return this._update();
    };

    ResourceWriteQueue.prototype.flush = function() {
      var write, _i, _len, _ref, _results;
      this._setFlushTimeout();
      _ref = this.queue;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        write = _ref[_i];
        _results.push(this._processWrite(write));
      }
      return _results;
    };

    ResourceWriteQueue.prototype.processResource = function(params, done) {
      var notDone, write, _i, _len, _ref, _results;
      notDone = true;
      _ref = this._writesForResource(params);
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        write = _ref[_i];
        _results.push(this._processWrite(write, (function(_this) {
          return function() {
            if (notDone && _this._writesForResource(params).length === 0) {
              notDone = false;
              return done();
            }
          };
        })(this)));
      }
      return _results;
    };

    ResourceWriteQueue.prototype._writesForResource = function(params) {
      var write, _i, _len, _ref, _results;
      _ref = this.queue;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        write = _ref[_i];
        if (angular.equals(params, write.params)) {
          _results.push(write);
        }
      }
      return _results;
    };

    ResourceWriteQueue.prototype._processWrite = function(write, done) {
      var cacheEntries, onFailure, onSuccess, writeData;
      if (angular.isArray(write.resourceParams)) {
        cacheEntries = write.resourceParams.map((function(_this) {
          return function(resourceParams) {
            return new ResourceCacheEntry(_this.CachedResource.$key, resourceParams).load();
          };
        })(this));
        writeData = cacheEntries.map(function(cacheEntry) {
          return cacheEntry.value;
        });
      } else {
        cacheEntries = [new ResourceCacheEntry(this.CachedResource.$key, write.resourceParams).load()];
        writeData = cacheEntries[0].value;
      }
      this.logStatusOfRequest('processed', write.action, write.resourceParams, writeData);
      onSuccess = (function(_this) {
        return function(value) {
          var cacheEntry, _i, _len, _ref;
          _this.logStatusOfRequest('succeeded', write.action, write.resourceParams, writeData);
          _this.removeWrite(write);
          for (_i = 0, _len = cacheEntries.length; _i < _len; _i++) {
            cacheEntry = cacheEntries[_i];
            cacheEntry.setClean();
          }
          if ((_ref = write.deferred) != null) {
            _ref.resolve(value);
          }
          if (angular.isFunction(done)) {
            return done();
          }
        };
      })(this);
      onFailure = (function(_this) {
        return function(error) {
          var _ref;
          if (error && error.status >= 400 && error.status < 500) {
            _this.removeWrite(write);
            _this.logStatusOfRequest("failed with error " + (angular.toJson(error)) + "; removed from queue", write.action, write.resourceParams, writeData);
          } else {
            _this.logStatusOfRequest("failed with error " + (angular.toJson(error)) + "; still in queue", write.action, write.resourceParams, writeData);
          }
          return (_ref = write.deferred) != null ? _ref.reject(error) : void 0;
        };
      })(this);
      return this.CachedResource.$resource[write.action](write.params, writeData, onSuccess, onFailure);
    };

    ResourceWriteQueue.prototype._setFlushTimeout = function() {
      if (this.queue.length > 0 && !this.timeoutPromise) {
        this.timeoutPromise = this.$timeout(angular.bind(this, this.flush), CACHE_RETRY_TIMEOUT);
        return this.timeoutPromise.then((function(_this) {
          return function() {
            delete _this.timeoutPromise;
            return _this._setFlushTimeout();
          };
        })(this));
      }
    };

    ResourceWriteQueue.prototype._update = function() {
      var savableQueue;
      savableQueue = this.queue.map(function(write) {
        return {
          params: write.params,
          resourceParams: write.resourceParams,
          action: write.action
        };
      });
      return Cache.setItem(this.key, savableQueue);
    };

    return ResourceWriteQueue;

  })();
};

},{"./cache":1,"./resource_cache_entry":5}]},{},[3])