!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.baobabangular=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
'use strict';

// When requiring Angular it is added to global for some reason
var angular = global.angular || require('angular') && global.angular;
var Baobab = require('baobab');
var safeDeepClone = require('./safeDeepClone.js');

// Flux Service is a wrapper for the Yahoo Dispatchr
var BaobabService = function ($rootScope) {

  this.create = function (tree, options) {
    options = options || {};

    options.clone = true;
    options.cloningFunction = function (obj) {
      return safeDeepClone('[circular]', [], obj);
    };

    var tree = new Baobab(tree, options);
    tree.on('update', function () {
      setTimeout(function () {
        $rootScope.$apply();
      }, 0);
    });
    return tree;
  };

};



// Monkeypatch angular module (add .store)

angular.module('baobab', [])
  .provider('baobab', function FluxProvider() {
    this.$get = ['$rootScope', function fluxFactory($rootScope) {
      return new BaobabService($rootScope);
    }];
  })
  .run(['$rootScope', '$injector', 'baobab', function ($rootScope, $injector, baobab) {

    // Extend scopes with $listenTo
    $rootScope.constructor.prototype.$listenTo = function (branch, eventName, callback) {

      if (!callback) {
        callback = eventName;
        eventName = 'update';
      }

      callback = callback.bind(this);

      branch.on(eventName, callback);

      // Remove any listeners to the tree when scope is destroyed (GC)
      this.$on('$destroy', function () {
        branch.off(branch, callback);
      });

    };

  }]);

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./safeDeepClone.js":15,"angular":"angular","baobab":3}],2:[function(require,module,exports){
module.exports={
  "autoCommit": true,
  "asynchronous": true,
  "clone": false,
  "cloningFunction": null,
  "cursorSingletons": true,
  "maxHistory": 0,
  "mixins": [],
  "shiftReferences": false,
  "typology": null,
  "validate": null
}

},{}],3:[function(require,module,exports){
/**
 * Baobab Public Interface
 * ========================
 *
 * Exposes the main library classes.
 */
var Baobab = require('./src/baobab.js'),
    helpers = require('./src/helpers.js');

// Non-writable version
Object.defineProperty(Baobab, 'version', {
  value: '0.3.2'
});

// Exposing helpers
Baobab.getIn = helpers.getIn;

// Exporting
module.exports = Baobab;

},{"./src/baobab.js":6,"./src/helpers.js":9}],4:[function(require,module,exports){
(function() {
  'use strict';

  /**
   * Here is the list of every allowed parameter when using Emitter#on:
   * @type {Object}
   */
  var __allowedOptions = {
    once: 'boolean',
    scope: 'object'
  };


  /**
   * The emitter's constructor. It initializes the handlers-per-events store and
   * the global handlers store.
   *
   * Emitters are useful for non-DOM events communication. Read its methods
   * documentation for more information about how it works.
   *
   * @return {Emitter}         The fresh new instance.
   */
  var Emitter = function() {
    this._enabled = true;
    this._children = [];
    this._handlers = {};
    this._handlersAll = [];
  };


  /**
   * This method binds one or more functions to the emitter, handled to one or a
   * suite of events. So, these functions will be executed anytime one related
   * event is emitted.
   *
   * It is also possible to bind a function to any emitted event by not
   * specifying any event to bind the function to.
   *
   * Recognized options:
   * *******************
   *  - {?boolean} once   If true, the handlers will be unbound after the first
   *                      execution. Default value: false.
   *  - {?object}  scope  If a scope is given, then the listeners will be called
   *                      with this scope as "this".
   *
   * Variant 1:
   * **********
   * > myEmitter.on('myEvent', function(e) { console.log(e); });
   * > // Or:
   * > myEmitter.on('myEvent', function(e) { console.log(e); }, { once: true });
   *
   * @param  {string}   event   The event to listen to.
   * @param  {function} handler The function to bind.
   * @param  {?object}  options Eventually some options.
   * @return {Emitter}          Returns this.
   *
   * Variant 2:
   * **********
   * > myEmitter.on(
   * >   ['myEvent1', 'myEvent2'],
   * >   function(e) { console.log(e); }
   * >);
   * > // Or:
   * > myEmitter.on(
   * >   ['myEvent1', 'myEvent2'],
   * >   function(e) { console.log(e); }
   * >   { once: true }}
   * >);
   *
   * @param  {array}    events  The events to listen to.
   * @param  {function} handler The function to bind.
   * @param  {?object}  options Eventually some options.
   * @return {Emitter}          Returns this.
   *
   * Variant 3:
   * **********
   * > myEmitter.on({
   * >   myEvent1: function(e) { console.log(e); },
   * >   myEvent2: function(e) { console.log(e); }
   * > });
   * > // Or:
   * > myEmitter.on({
   * >   myEvent1: function(e) { console.log(e); },
   * >   myEvent2: function(e) { console.log(e); }
   * > }, { once: true });
   *
   * @param  {object}  bindings An object containing pairs event / function.
   * @param  {?object}  options Eventually some options.
   * @return {Emitter}          Returns this.
   *
   * Variant 4:
   * **********
   * > myEmitter.on(function(e) { console.log(e); });
   * > // Or:
   * > myEmitter.on(function(e) { console.log(e); }, { once: true});
   *
   * @param  {function} handler The function to bind to every events.
   * @param  {?object}  options Eventually some options.
   * @return {Emitter}          Returns this.
   */
  Emitter.prototype.on = function(a, b, c) {
    var i,
        l,
        k,
        event,
        eArray,
        bindingObject;

    // Variant 1 and 2:
    if (typeof b === 'function') {
      eArray = typeof a === 'string' ?
        [a] :
        a;

      for (i = 0, l = eArray.length; i !== l; i += 1) {
        event = eArray[i];

        // Check that event is not '':
        if (!event)
          continue;

        if (!this._handlers[event])
          this._handlers[event] = [];

        bindingObject = {
          handler: b
        };

        for (k in c || {})
          if (__allowedOptions[k])
            bindingObject[k] = c[k];
          else
            throw new Error(
              'The option "' + k + '" is not recognized by Emmett.'
            );

        this._handlers[event].push(bindingObject);
      }

    // Variant 3:
    } else if (a && typeof a === 'object' && !Array.isArray(a))
      for (event in a)
        Emitter.prototype.on.call(this, event, a[event], b);

    // Variant 4:
    else if (typeof a === 'function') {
      bindingObject = {
        handler: a
      };

      for (k in c || {})
        if (__allowedOptions[k])
          bindingObject[k] = c[k];
        else
          throw new Error(
            'The option "' + k + '" is not recognized by Emmett.'
          );

      this._handlersAll.push(bindingObject);
    }

    // No matching variant:
    else
      throw new Error('Wrong arguments.');

    return this;
  };


  /**
   * This method works exactly as the previous #on, but will add an options
   * object if none is given, and set the option "once" to true.
   *
   * The polymorphism works exactly as with the #on method.
   */
  Emitter.prototype.once = function(a, b, c) {
    // Variant 1 and 2:
    if (typeof b === 'function') {
      c = c || {};
      c.once = true;
      this.on(a, b, c);

    // Variants 3 and 4:
    } else if (
      // Variant 3:
      (a && typeof a === 'object' && !Array.isArray(a)) ||
      // Variant 4:
      (typeof a === 'function')
    ) {
      b = b || {};
      b.once = true;
      this.on(a, b);

    // No matching variant:
    } else
      throw new Error('Wrong arguments.');

    return this;
  };


  /**
   * This method unbinds one or more functions from events of the emitter. So,
   * these functions will no more be executed when the related events are
   * emitted. If the functions were not bound to the events, nothing will
   * happen, and no error will be thrown.
   *
   * Variant 1:
   * **********
   * > myEmitter.off('myEvent', myHandler);
   *
   * @param  {string}   event   The event to unbind the handler from.
   * @param  {function} handler The function to unbind.
   * @return {Emitter}          Returns this.
   *
   * Variant 2:
   * **********
   * > myEmitter.off(['myEvent1', 'myEvent2'], myHandler);
   *
   * @param  {array}    events  The events to unbind the handler from.
   * @param  {function} handler The function to unbind.
   * @return {Emitter}          Returns this.
   *
   * Variant 3:
   * **********
   * > myEmitter.off({
   * >   myEvent1: myHandler1,
   * >   myEvent2: myHandler2
   * > });
   *
   * @param  {object} bindings An object containing pairs event / function.
   * @return {Emitter}         Returns this.
   *
   * Variant 4:
   * **********
   * > myEmitter.off(myHandler);
   *
   * @param  {function} handler The function to unbind from every events.
   * @return {Emitter}          Returns this.
   */
  Emitter.prototype.off = function(events, handler) {
    var i,
        n,
        j,
        m,
        k,
        a,
        event,
        eArray = typeof events === 'string' ?
          [events] :
          events;

    if (arguments.length === 1 && typeof eArray === 'function') {
      handler = arguments[0];

      // Handlers bound to events:
      for (k in this._handlers) {
        a = [];
        for (i = 0, n = this._handlers[k].length; i !== n; i += 1)
          if (this._handlers[k][i].handler !== handler)
            a.push(this._handlers[k][i]);
        this._handlers[k] = a;
      }

      a = [];
      for (i = 0, n = this._handlersAll.length; i !== n; i += 1)
        if (this._handlersAll[i].handler !== handler)
          a.push(this._handlersAll[i]);
      this._handlersAll = a;
    }

    else if (arguments.length === 2) {
      for (i = 0, n = eArray.length; i !== n; i += 1) {
        event = eArray[i];
        if (this._handlers[event]) {
          a = [];
          for (j = 0, m = this._handlers[event].length; j !== m; j += 1)
            if (this._handlers[event][j].handler !== handler)
              a.push(this._handlers[event][j]);

          this._handlers[event] = a;
        }

        if (this._handlers[event] && this._handlers[event].length === 0)
          delete this._handlers[event];
      }
    }

    return this;
  };


  /**
   * This method unbinds every handlers attached to every or any events. So,
   * these functions will no more be executed when the related events are
   * emitted. If the functions were not bound to the events, nothing will
   * happen, and no error will be thrown.
   *
   * Usage:
   * ******
   * > myEmitter.unbindAll();
   *
   * @return {Emitter}      Returns this.
   */
  Emitter.prototype.unbindAll = function() {
    var k;

    this._handlersAll = [];
    for (k in this._handlers)
      delete this._handlers[k];

    return this;
  };


  /**
   * This method emits the specified event(s), and executes every handlers bound
   * to the event(s).
   *
   * Use cases:
   * **********
   * > myEmitter.emit('myEvent');
   * > myEmitter.emit('myEvent', myData);
   * > myEmitter.emit(['myEvent1', 'myEvent2']);
   * > myEmitter.emit(['myEvent1', 'myEvent2'], myData);
   *
   * @param  {string|array} events The event(s) to emit.
   * @param  {object?}      data   The data.
   * @return {Emitter}             Returns this.
   */
  Emitter.prototype.emit = function(events, data) {
    var i,
        n,
        j,
        m,
        a,
        event,
        child,
        handlers,
        eventName,
        self = this,
        eArray = typeof events === 'string' ?
          [events] :
          events;

    // Check that the emitter is enabled:
    if (!this._enabled)
      return this;

    data = data === undefined ? {} : data;

    for (i = 0, n = eArray.length; i !== n; i += 1) {
      eventName = eArray[i];
      handlers = (this._handlers[eventName] || []).concat(this._handlersAll);

      if (handlers.length) {
        event = {
          type: eventName,
          data: data || {},
          target: this
        };
        a = [];

        for (j = 0, m = handlers.length; j !== m; j += 1) {
          handlers[j].handler.call(
            'scope' in handlers[j] ? handlers[j].scope : this,
            event
          );
          if (!handlers[j].once)
            a.push(handlers[j]);
        }

        this._handlers[eventName] = a;
      }
    }

    // Events propagation:
    for (i = 0, n = this._children.length; i !== n; i += 1) {
      child = this._children[i];
      child.emit.apply(child, arguments);
    }

    return this;
  };


  /**
   * This method creates a new instance of Emitter and binds it as a child. Here
   * is what children do:
   *  - When the parent emits an event, the children will emit the same later
   *  - When a child is killed, it is automatically unreferenced from the parent
   *  - When the parent is killed, all children will be killed as well
   *
   * @return {Emitter} Returns the fresh new child.
   */
  Emitter.prototype.child = function() {
    var self = this,
        child = new Emitter();

    child.on('emmett:kill', function() {
      if (self._children)
        for (var i = 0, l = self._children.length; i < l; i++)
          if (self._children[i] === child) {
            self._children.splice(i, 1);
            break;
          }
    });
    this._children.push(child);

    return child;
  };


  /**
   * This method will first dispatch a "emmett:kill" event, and then unbinds all
   * listeners and make it impossible to ever rebind any listener to any event.
   */
  Emitter.prototype.kill = function() {
    this.emit('emmett:kill');

    this.unbindAll();
    this._handlers = null;
    this._handlersAll = null;
    this._enabled = false;

    if (this._children)
      for (var i = 0, l = this._children.length; i < l; i++)
        this._children[i].kill();

    this._children = null;
  };


  /**
   * This method disabled the emitter, which means its emit method will do
   * nothing.
   *
   * @return {Emitter} Returns this.
   */
  Emitter.prototype.disable = function() {
    this._enabled = false;

    return this;
  };


  /**
   * This method enables the emitter.
   *
   * @return {Emitter} Returns this.
   */
  Emitter.prototype.enable = function() {
    this._enabled = true;

    return this;
  };


  /**
   * Version:
   */
  Emitter.version = '2.1.1';


  // Export:
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports)
      exports = module.exports = Emitter;
    exports.Emitter = Emitter;
  } else if (typeof define === 'function' && define.amd)
    define('emmett', [], function() {
      return Emitter;
    });
  else
    this.Emitter = Emitter;
}).call(this);

},{}],5:[function(require,module,exports){
/**
 * typology.js - A data validation library for Node.js and the browser,
 *
 * Version: 0.3.1
 * Sources: http://github.com/jacomyal/typology
 * Doc:     http://github.com/jacomyal/typology#readme
 *
 * License:
 * --------
 * Copyright © 2014 Alexis Jacomy (@jacomyal), Guillaume Plique (@Yomguithereal)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * The Software is provided "as is", without warranty of any kind, express or
 * implied, including but not limited to the warranties of merchantability,
 * fitness for a particular purpose and noninfringement. In no event shall the
 * authors or copyright holders be liable for any claim, damages or other
 * liability, whether in an action of contract, tort or otherwise, arising
 * from, out of or in connection with the software or the use or other dealings
 * in the Software.
 */
(function(global) {
  'use strict';

  /**
   * Code conventions:
   * *****************
   *  - 80 characters max per line
   *  - Write "__myVar" for any global private variable
   *  - Write "_myVar" for any instance private variable
   *  - Write "myVar" any local variable
   */



  /**
   * PRIVATE GLOBALS:
   * ****************
   */

  /**
   * This object is a dictionnary that maps "[object Something]" strings to the
   * typology form "something":
   */
  var __class2type = {};

  /**
   * This array is the list of every types considered native by typology:
   */
  var __nativeTypes = ['*'];

  (function() {
    var k,
        className,
        classes = [
          'Arguments',
          'Boolean',
          'Number',
          'String',
          'Function',
          'Array',
          'Date',
          'RegExp',
          'Object'
        ];

    // Fill types
    for (k in classes) {
      className = classes[k];
      __nativeTypes.push(className.toLowerCase());
      __class2type['[object ' + className + ']'] = className.toLowerCase();
    }
  })();



  /**
   * CONSTRUCTOR:
   * ************
   */
  function Typology(defs) {
    /**
     * INSTANCE PRIVATES:
     * ******************
     */

    var _self = this;

    /**
     * This objects will contain every instance-specific custom types:
     */
    var _customTypes = {};

    /**
     * This function will recursively scan an object to check wether or not it
     * matches a given type. It will return null if it matches, and an Error
     * object else.
     *
     * Examples:
     * *********
     * 1. When the type matches:
     *  > _scan('abc', 'string');
     *  will return null.
     *
     * 2. When a top-level type does not match:
     *  > _scan('abc', 'number');
     *  will return an Error object with the following information:
     *   - message: Expected a "number" but found a "string".
     *
     * 3. When a sub-object type does not its type:
     *  > _scan({ a: 'abc' }, { a: 'number' });
     *  will return an Error object with the following information:
     *   - message: Expected a "number" but found a "string".
     *   - path: [ 'a' ]
     *
     * 4. When a deep sub-object type does not its type:
     *  > _scan({ a: [ 123, 'abc' ] }, { a: ['number'] });
     *  will return an Error object with the following information:
     *   - message: Expected a "number" but found a "string".
     *   - path: [ 'a', 1 ]
     *
     * 5. When a required key is missing:
     *  > _scan({}, { a: 'number' });
     *  will return an Error object with the following information:
     *   - message: Expected a "number" but found a "undefined".
     *   - path: [ 'a' ]
     *
     * 6. When an unexpected key is present:
     *  > _scan({ a: 123, b: 456 }, { a: 'number' });
     *  will return an Error object with the following information:
     *   - message: Unexpected key "b".
     *
     * @param  {*}      obj  The value to validate.
     * @param  {type}   type The type.
     * @return {?Error}      Returns null or an Error object.
     */
    function _scan(obj, type) {
      var a,
          i,
          l,
          k,
          error,
          subError,
          hasStar,
          hasTypeOf,
          optional = false,
          exclusive = false,
          typeOf = _self.get(obj);

      if (_self.get(type) === 'string') {
        a = type.replace(/^[\?\!]/, '').split(/\|/);
        l = a.length;
        for (i = 0; i < l; i++)
          if (__nativeTypes.indexOf(a[i]) < 0 && !(a[i] in _customTypes))
            throw new Error('Invalid type.');

        if (type.match(/^\?/))
          optional = true;

        if (type.replace(/^\?/, '').match(/^\!/))
          exclusive = true;

        if (exclusive && optional)
          throw new Error('Invalid type.');

        for (i in a)
          if (_customTypes[a[i]])
            if (
              (typeof _customTypes[a[i]].type === 'function') ?
                (_customTypes[a[i]].type.call(_self, obj) === true) :
                !_scan(obj, _customTypes[a[i]].type)
            ) {
              if (exclusive) {
                error = new Error();
                error.message = 'Expected a "' + type + '" but found a ' +
                                '"' + a[i] + '".';
              error.expected = type;
              error.type = a[i];
              error.value = obj;
                return error;
              } else
                return null;
            }

        if (obj === null || obj === undefined) {
          if (!exclusive && !optional) {
            error = new Error();
            error.message = 'Expected a "' + type + '" but found a ' +
                            '"' + typeOf + '".';
            error.expected = type;
            error.type = typeOf;
            error.value = obj;
            return error;
          } else
            return null;

        } else {
          hasStar = ~a.indexOf('*');
          hasTypeOf = ~a.indexOf(typeOf);
          if (exclusive && (hasStar || hasTypeOf)) {
            error = new Error();
            error.message = 'Expected a "' + type + '" but found a ' +
                            '"' + (hasTypeOf ? typeOf : '*') + '".';
            error.type = hasTypeOf ? typeOf : '*';
            error.expected = type;
            error.value = obj;
            return error;

          } else if (!exclusive && !(hasStar || hasTypeOf)) {
            error = new Error();
            error.message = 'Expected a "' + type + '" but found a ' +
                            '"' + typeOf + '".';
            error.expected = type;
            error.type = typeOf;
            error.value = obj;
            return error;

          } else
            return null;
        }

      } else if (_self.get(type) === 'object') {
        if (typeOf !== 'object') {
          error = new Error();
          error.message = 'Expected an object but found a "' + typeOf + '".';
          error.expected = type;
          error.type = typeOf;
          error.value = obj;
          return error;
        }

        for (k in type)
          if ((subError = _scan(obj[k], type[k]))) {
            error = subError;
            error.path = error.path ?
              [k].concat(error.path) :
              [k];
            return error;
          }

        for (k in obj)
          if (type[k] === undefined) {
            error = new Error();
            error.message = 'Unexpected key "' + k + '".';
            error.type = typeOf;
            error.value = obj;
            return error;
          }

        return null;

      } else if (_self.get(type) === 'array') {
        if (type.length !== 1)
          throw new Error('Invalid type.');

        if (typeOf !== 'array') {
          error = new Error();
          error.message = 'Expected an array but found a "' + typeOf + '".';
          error.expected = type;
          error.type = typeOf;
          error.value = obj;
          return error;
        }

        l = obj.length;
        for (i = 0; i < l; i++)
          if ((subError = _scan(obj[i], type[0]))) {
            error = subError;
            error.path = error.path ?
              [i].concat(error.path) :
              [i];
            return error;
          }

        return null;
      } else
        throw new Error('Invalid type.');
    }



    /**
     * INSTANCE METHODS:
     * *****************
     */

    /**
     * This method registers a custom type into the Typology instance. A type
     * is registered under a unique name, and is described by an object (like
     * classical C structures) or a function.
     *
     * Variant 1:
     * **********
     * > types.add('user', { id: 'string', name: '?string' });
     *
     * @param  {string}   id   The unique id of the type.
     * @param  {object}   type The corresponding structure.
     * @return {Typology}      Returns this.
     *
     * Variant 2:
     * **********
     * > types.add('integer', function(value) {
     * >   return typeof value === 'number' && value === value | 0;
     * > });
     *
     * @param  {string}   id   The unique id of the type.
     * @param  {function} type The function validating the type.
     * @return {Typology}      Returns this.
     *
     * Variant 3:
     * **********
     * > types.add({
     * >   id: 'user',
     * >   type: { id: 'string', name: '?string' }
     * > });
     *
     * > types.add({
     * >   id: 'integer',
     * >   type: function(value) {
     * >     return typeof value === 'number' && value === value | 0;
     * >   }
     * > });
     *
     * @param  {object}   specs An object describing fully the type.
     * @return {Typology}       Returns this.
     *
     * Recognized parameters:
     * **********************
     * Here is the exhaustive list of every accepted parameters in the specs
     * object:
     *
     *   {string}          id    The unique id of the type.
     *   {function|object} type  The function or the structure object
     *                           validating the type.
     *   {?[string]}       proto Eventually an array of ids of types that are
     *                           referenced in the structure but do not exist
     *                           yet.
     */
    this.add = function(a1, a2) {
      var o,
          k,
          a,
          id,
          tmp,
          type;

      // Polymorphism:
      if (arguments.length === 1) {
        if (this.get(a1) === 'object') {
          o = a1;
          id = o.id;
          type = o.type;
        } else
          throw new Error('If types.add is called with one argument, ' +
                          'this one has to be an object.');
      } else if (arguments.length === 2) {
        if (typeof a1 !== 'string' || !a1)
          throw new Error('If types.add is called with more than one ' +
                          'argument, the first one must be the string id.');
        else
          id = a1;

        type = a2;
      } else
        throw new Error('types.add has to be called ' +
                        'with one or two arguments.');

      if (this.get(id) !== 'string' || id.length === 0)
        throw new Error('A type requires an string id.');

      if (_customTypes[id] !== undefined && _customTypes[id] !== 'proto')
        throw new Error('The type "' + id + '" already exists.');

      if (~__nativeTypes.indexOf(id))
        throw new Error('"' + id + '" is a reserved type name.');

      _customTypes[id] = 1;

      // Check given prototypes:
      a = (o || {}).proto || [];
      a = Array.isArray(a) ? a : [a];
      tmp = {};
      for (k in a)
        if (_customTypes[a[k]] === undefined) {
          _customTypes[a[k]] = 1;
          tmp[a[k]] = 1;
        }

      if ((this.get(type) !== 'function') && !this.isValid(type))
        throw new Error('A type requires a valid definition. ' +
                        'This one can be a preexistant type or else ' +
                        'a function testing given objects.');

      // Effectively add the type:
      _customTypes[id] = (o === undefined) ?
        {
          id: id,
          type: type
        } :
        {};

      if (o !== undefined)
        for (k in o)
          _customTypes[id][k] = o[k];

      // Delete prototypes:
      for (k in tmp)
        if (k !== id)
          delete _customTypes[k];

      return this;
    };

    /**
     * This method returns true if a custom type is already registered in this
     * instance under the given key.
     *
     * @param  {string}  key A type name.
     * @return {boolean}     Returns true if the key is registered.
     */
    this.has = function(key) {
      return !!_customTypes[key];
    };

    /**
     * This method returns the native type of a given value.
     *
     * Examples:
     * *********
     * > types.get({ a: 1 }); // returns "object"
     * > types.get('abcde');  // returns "string"
     * > types.get(1234567);  // returns "number"
     * > types.get([1, 2]);   // returns "array"
     *
     * @param  {*}      value Anything.
     * @return {string}       Returns the native type of the value.
     */
    this.get = function(obj) {
      return (obj === null || obj === undefined) ?
        String(obj) :
        __class2type[Object.prototype.toString.call(obj)] || 'object';
    };

    /**
     * This method validates some value against a given type. If the flag throws
     * has a truthy value, then the method will throw an error instead of
     * returning false.
     *
     * To know more about the error thrown, you can read the documentation of
     * the private method _scan.
     *
     * Examples:
     * *********
     * > types.check({ a: 1 }, 'object');                      // returns true
     * > types.check({ a: 1 }, { a: 'string' });               // returns true
     * > types.check({ a: 1 }, { a: 'string', b: '?number' }); // returns true
     *
     * > types.check({ a: 1 }, { a: 'string', b: 'number' }); // returns false
     * > types.check({ a: 1 }, { a: 'number' });              // returns false
     * > types.check({ a: 1 }, 'array');                      // returns false
     *
     * > types.check({ a: 1 }, 'array', true); // throws an Error
     *
     * @param  {*}        value  Anything.
     * @param  {type}     type   A valid type.
     * @param  {?boolean} throws If true, this method will throw an error
     *                           instead of returning false.
     * @return {boolean}         Returns true if the value matches the type, and
     *                           not else.
     */
    this.check = function(obj, type, throws) {
      var result = _scan(obj, type);
      if (throws && result)
        throw result;
      else
        return !result;
    };

    /**
     * This method validates a type. If the type is not referenced or is not
     * valid, it will return false.
     *
     * To know more about that function, don't hesitate to read the related
     * unit tests.
     *
     * Examples:
     * *********
     * > types.isValid('string');        // returns true
     * > types.isValid('?string');       // returns true
     * > types.isValid('!string');       // returns true
     * > types.isValid('string|number'); // returns true
     * > types.isValid({ a: 'string' }); // returns true
     * > types.isValid(['string']);      // returns true
     *
     * > types.isValid('!?string');                // returns false
     * > types.isValid('myNotDefinedType');        // returns false
     * > types.isValid(['myNotDefinedType']);      // returns false
     * > types.isValid({ a: 'myNotDefinedType' }); // returns false
     *
     * > types.isValid('user');               // returns false
     * > types.add('user', { id: 'string' }); // makes the type become valid
     * > types.isValid('user');               // returns true
     *
     * @param  {*}       type The type to get checked.
     * @return {boolean}      Returns true if the type is valid, and false else.
     */
    this.isValid = function(type) {
      var a,
          k,
          i;

      if (this.get(type) === 'string') {
        a = type.replace(/^[\?\!]/, '').split(/\|/);
        for (i in a)
          if (__nativeTypes.indexOf(a[i]) < 0 && !(a[i] in _customTypes))
            return false;
        return true;

      } else if (this.get(type) === 'object') {
        for (k in type)
          if (!this.isValid(type[k]))
            return false;
        return true;

      } else if (this.get(type) === 'array')
        return type.length === 1 ?
          this.isValid(type[0]) :
          false;
      else
        return false;
    };



    /**
     * INSTANTIATION ROUTINE:
     * **********************
     */

    // Add a type "type" to shortcut the #isValid method:
    this.add('type', (function(v) {
      return this.isValid(v);
    }).bind(this));

    // Add a type "primitive" to match every primitive types (including null):
    this.add('primitive', function(v) {
      return !v || !(v instanceof Object || typeof v === 'object');
    });

    // Adding custom types at instantiation:
    defs = defs || {};
    if (this.get(defs) !== 'object')
      throw Error('Invalid argument.');

    for (var k in defs)
      this.add(k, defs[k]);
  }



  /**
   * GLOBAL PUBLIC API:
   * ******************
   */

  // Creating a "main" typology instance to export:
  var types = Typology;
  Typology.call(types);

  // Version:
  Object.defineProperty(types, 'version', {
    value: '0.3.1'
  });



  /**
   * EXPORT:
   * *******
   */
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports)
      exports = module.exports = types;
    exports.types = types;
  } else if (typeof define === 'function' && define.amd)
    define('typology', [], function() {
      return types;
    });
  else
    this.types = types;
})(this);

},{}],6:[function(require,module,exports){
(function (process){
/**
 * Baobab Data Structure
 * ======================
 *
 * A handy data tree with cursors.
 */
var Cursor = require('./cursor.js'),
    EventEmitter = require('emmett'),
    Typology = require('typology'),
    helpers = require('./helpers.js'),
    update = require('./update.js'),
    merge = require('./merge.js'),
    mixins = require('./mixins.js'),
    defaults = require('../defaults.json'),
    type = require('./type.js');

/**
 * Main Class
 */
function Baobab(initialData, opts) {

  // New keyword optional
  if (!(this instanceof Baobab))
    return new Baobab(initialData, opts);

  if (!type.Object(initialData) && !type.Array(initialData))
    throw Error('Baobab: invalid data.');

  // Extending
  EventEmitter.call(this);

  // Merging defaults
  this.options = helpers.shallowMerge(defaults, opts);
  this._cloner = this.options.cloningFunction || helpers.deepClone;

  // Privates
  this._futureUpdate = {};
  this._willUpdate = false;
  this._history = [];
  this._registeredCursors = {};

  // Internal typology
  this.typology = this.options.typology ?
    (this.options.typology instanceof Typology ?
      this.options.typology :
      new Typology(this.options.typology)) :
    new Typology();

  // Internal validation
  this.validate = this.options.validate || null;

  if (this.validate)
    try {
      this.typology.check(initialData, this.validate, true);
    }
    catch (e) {
      e.message = '/' + e.path.join('/') + ': ' + e.message;
      throw e;
    }

  // Properties
  this.data = this._cloner(initialData);

  // Mixin
  this.mixin = mixins.baobab(this);
}

helpers.inherits(Baobab, EventEmitter);

/**
 * Private prototype
 */
Baobab.prototype._stack = function(spec) {
  var self = this;

  if (!type.Object(spec))
    throw Error('Baobab.update: wrong specification.');

  this._futureUpdate = merge(spec, this._futureUpdate);

  // Should we let the user commit?
  if (!this.options.autoCommit)
    return this;

  // Should we update synchronously?
  if (!this.options.asynchronous)
    return this.commit();

  // Updating asynchronously
  if (!this._willUpdate) {
    this._willUpdate = true;
    process.nextTick(function() {
      if (self._willUpdate)
        self.commit();
    });
  }

  return this;
};

Baobab.prototype._archive = function() {
  if (this.options.maxHistory <= 0)
    return;

  var record = {
    data: this._cloner(this.data)
  };

  // Replacing
  if (this._history.length === this.options.maxHistory) {
    this._history.pop();
  }
  this._history.unshift(record);

  return record;
};

/**
 * Prototype
 */
Baobab.prototype.commit = function(referenceRecord) {
  var self = this,
      log;

  if (referenceRecord) {

    // Override
    this.data = referenceRecord.data;
    log = referenceRecord.log;
  }
  else {

    // Shifting root reference
    if (this.options.shiftReferences)
      this.data = helpers.shallowClone(this.data);

    // Applying modification (mutation)
    var record = this._archive();
    log = update(this.data, this._futureUpdate, this.options);

    if (record)
      record.log = log;
  }

  if (this.validate) {
    var errors = [],
        l = log.length,
        d,
        i;

    for (i = 0; i < l; i++) {
      d = helpers.getIn(this.validate, log[i]);

      if (!d)
        continue;

      try {
        this.typology.check(this.get(log[i]), d, true);
      }
      catch (e) {
        e.path = log[i].concat((e.path || []));
        errors.push(e);
      }
    }

    if (errors.length)
      this.emit('invalid', {errors: errors});
  }

  // Baobab-level update event
  this.emit('update', {
    log: log
  });

  // Resetting
  this._futureUpdate = {};
  this._willUpdate = false;

  return this;
};

Baobab.prototype.select = function(path) {
  if (arguments.length > 1)
    path = helpers.arrayOf(arguments);

  if (!type.Path(path))
    throw Error('Baobab.select: invalid path.');

  // Casting to array
  path = !type.Array(path) ? [path] : path;

  // Complex path?
  var complex = type.ComplexPath(path);

  var solvedPath;

  if (complex)
    solvedPath = helpers.solvePath(this.data, path);

  // Registering a new cursor or giving the already existing one for path
  if (!this.options.cursorSingletons) {
    return new Cursor(this, path);
  }
  else {
    var hash = path.join('λ');

    if (!this._registeredCursors[hash]) {
      var cursor = new Cursor(this, path, solvedPath);
      this._registeredCursors[hash] = cursor;
      return cursor;
    }
    else {
      return this._registeredCursors[hash];
    }
  }
};

Baobab.prototype.reference = function(path) {
  var data;

  if (arguments.length > 1)
    path = helpers.arrayOf(arguments);

  if (!type.Path(path))
    throw Error('Baobab.get: invalid path.');

  return helpers.getIn(
    this.data, type.String(path) || type.Number(path) ? [path] : path
  );
};

Baobab.prototype.get = function() {
  var ref = this.reference.apply(this, arguments);

  return this.options.clone ? this._cloner(ref) : ref;
};

Baobab.prototype.clone = function(path) {
  return this._cloner(this.reference.apply(this, arguments));
};

Baobab.prototype.set = function(key, val) {

  if (arguments.length < 2)
    throw Error('Baobab.set: expects a key and a value.');

  var spec = {};
  spec[key] = {$set: val};

  return this.update(spec);
};

Baobab.prototype.update = function(spec) {
  return this._stack(spec);
};

Baobab.prototype.hasHistory = function() {
  return !!this._history.length;
};

Baobab.prototype.getHistory = function() {
  return this._history;
};

Baobab.prototype.undo = function() {
  if (!this.hasHistory())
    throw Error('Baobab.undo: no history recorded, cannot undo.');

  var lastRecord = this._history.shift();
  this.commit(lastRecord);
};

Baobab.prototype.release = function() {
  this.unbindAll();
  delete this.data;
  delete this._futureUpdate;
  delete this._history;
  delete this._registeredCursors;
};

/**
 * Output
 */
Baobab.prototype.toJSON = function() {
  return this.reference();
};

/**
 * Export
 */
module.exports = Baobab;

}).call(this,require('_process'))
},{"../defaults.json":2,"./cursor.js":8,"./helpers.js":9,"./merge.js":10,"./mixins.js":11,"./type.js":12,"./update.js":13,"_process":14,"emmett":4,"typology":5}],7:[function(require,module,exports){
/**
 * Baobab Cursor Combination
 * ==========================
 *
 * A useful abstraction dealing with cursor's update logical combinations.
 */
var EventEmitter = require('emmett'),
    helpers = require('./helpers.js'),
    type = require('./type.js');

/**
 * Utilities
 */
function bindCursor(c, cursor) {
  cursor.on('update', c.cursorListener);
}

/**
 * Main Class
 */
function Combination(operator /*, &cursors */) {
  var self = this;

  // Safeguard
  if (arguments.length < 2)
    throw Error('baobab.Combination: not enough arguments.');

  var first = arguments[1],
      rest = helpers.arrayOf(arguments).slice(2);

  if (first instanceof Array) {
    rest = first.slice(1);
    first = first[0];
  }

  if (!type.Cursor(first))
    throw Error('baobab.Combination: argument should be a cursor.');

  if (operator !== 'or' && operator !== 'and')
    throw Error('baobab.Combination: invalid operator.');

  // Extending event emitter
  EventEmitter.call(this);

  // Properties
  this.cursors = [first];
  this.operators = [];
  this.root = first.root;

  // State
  this.updates = new Array(this.cursors.length);

  // Listeners
  this.cursorListener = function() {
    self.updates[self.cursors.indexOf(this)] = true;
  };

  this.treeListener = function() {
    var shouldFire = self.updates[0],
        i,
        l;

    for (i = 1, l = self.cursors.length; i < l; i++) {
      shouldFire = self.operators[i - 1] === 'or' ?
        shouldFire || self.updates[i] :
        shouldFire && self.updates[i];
    }

    if (shouldFire)
      self.emit('update');

    // Waiting for next update
    self.updates = new Array(self.cursors.length);
  };

  // Initial bindings
  this.root.on('update', this.treeListener);
  bindCursor(this, first);

  // Attaching any other passed cursors
  rest.forEach(function(cursor) {
    this[operator](cursor);
  }, this);
}

helpers.inherits(Combination, EventEmitter);

/**
 * Prototype
 */
function makeOperator(operator) {
  Combination.prototype[operator] = function(cursor) {

    // Safeguard
    if (!type.Cursor(cursor))
      throw Error('baobab.Combination.' + operator + ': argument should be a cursor.');

    if (~this.cursors.indexOf(cursor))
      throw Error('baobab.Combination.' + operator + ': cursor already in combination.');

    this.cursors.push(cursor);
    this.operators.push(operator);
    this.updates.length++;
    bindCursor(this, cursor);

    return this;
  };
}

makeOperator('or');
makeOperator('and');

Combination.prototype.release = function() {

  // Dropping own listeners
  this.unbindAll();

  // Dropping cursors listeners
  this.cursors.forEach(function(cursor) {
    cursor.off('update', this.cursorListener);
  }, this);

  // Dropping tree listener
  this.root.off('update', this.treeListener);

  // Cleaning
  this.cursors = null;
  this.operators = null;
  this.root = null;
  this.updates = null;
};

/**
 * Exporting
 */
module.exports = Combination;

},{"./helpers.js":9,"./type.js":12,"emmett":4}],8:[function(require,module,exports){
/**
 * Baobab Cursor Abstraction
 * ==========================
 *
 * Nested selection into a baobab tree.
 */
var EventEmitter = require('emmett'),
    Combination = require('./combination.js'),
    mixins = require('./mixins.js'),
    helpers = require('./helpers.js'),
    type = require('./type.js');

/**
 * Main Class
 */
function Cursor(root, path, solvedPath) {
  var self = this;

  // Extending event emitter
  EventEmitter.call(this);

  // Enforcing array
  path = path || [];

  // Properties
  this.root = root;
  this.path = path;
  this.relevant = this.reference() !== undefined;

  // Complex path?
  this.complexPath = !!solvedPath;
  this.solvedPath = this.complexPath ? solvedPath : this.path;

  // Root listeners
  this.updateHandler = function(e) {
    var log = e.data.log,
        shouldFire = false,
        c, p, l, m, i, j;

    // Solving path if needed
    if (self.complexPath)
      self.solvedPath = helpers.solvePath(self.root.data, self.path);

    // If no handlers are attached, we stop
    if (!this._handlers.update.length && !this._handlersAll.length)
      return;

    // If selector listens at root, we fire
    if (!self.path.length)
      return self.emit('update');

    // Checking update log to see whether the cursor should update.
    root:
    for (i = 0, l = log.length; i < l; i++) {
      c = log[i];

      for (j = 0, m = c.length; j < m; j++) {
        p = c[j];

        // If path is not relevant to us, we break
        if (p !== '' + self.solvedPath[j])
          break;

        // If we reached last item and we are relevant, we fire
        if (j + 1 === m || j + 1 === self.solvedPath.length) {
          shouldFire = true;
          break root;
        }
      }
    }

    // Handling relevancy
    var data = self.reference() !== undefined;

    if (self.relevant) {
      if (data && shouldFire) {
        self.emit('update');
      }
      else {
        self.emit('irrelevant');
        self.relevant = false;
      }
    }
    else {
      if (data && shouldFire) {
        self.emit('relevant');
        self.emit('update');
        self.relevant = true;
      }
    }
  };

  // Listening
  this.root.on('update', this.updateHandler);

  // Making mixin
  this.mixin = mixins.cursor(this);
}

helpers.inherits(Cursor, EventEmitter);

/**
 * Private prototype
 */
Cursor.prototype._stack = function(spec) {
  this.root._stack(helpers.pathObject(this.solvedPath, spec));
  return this;
};

/**
 * Predicates
 */
Cursor.prototype.isRoot = function() {
  return !this.path.length;
};

Cursor.prototype.isLeaf = function() {
  return type.Primitive(this.reference());
};

Cursor.prototype.isBranch = function() {
  return !this.isLeaf() && !this.isRoot();
};

/**
 * Traversal
 */
Cursor.prototype.select = function(path) {
  if (arguments.length > 1)
    path = helpers.arrayOf(arguments);

  if (!type.Path(path))
    throw Error('baobab.Cursor.select: invalid path.');
  return this.root.select(this.path.concat(path));
};

Cursor.prototype.up = function() {
  if (this.solvedPath && this.solvedPath.length)
    return this.root.select(this.path.slice(0, -1));
  else
    return null;
};

Cursor.prototype.left = function() {
  var last = +this.solvedPath[this.solvedPath.length - 1];

  if (isNaN(last))
    throw Error('baobab.Cursor.left: cannot go left on a non-list type.');

  return last ?
    this.root.select(this.solvedPath.slice(0, -1).concat(last - 1)) :
    null;
};

Cursor.prototype.leftmost = function() {
  var last = +this.solvedPath[this.solvedPath.length - 1];

  if (isNaN(last))
    throw Error('baobab.Cursor.leftmost: cannot go left on a non-list type.');

  return this.root.select(this.solvedPath.slice(0, -1).concat(0));
};

Cursor.prototype.right = function() {
  var last = +this.solvedPath[this.solvedPath.length - 1];

  if (isNaN(last))
    throw Error('baobab.Cursor.right: cannot go right on a non-list type.');

  if (last + 1 === this.up().reference().length)
    return null;

  return this.root.select(this.solvedPath.slice(0, -1).concat(last + 1));
};

Cursor.prototype.rightmost = function() {
  var last = +this.solvedPath[this.solvedPath.length - 1];

  if (isNaN(last))
    throw Error('baobab.Cursor.right: cannot go right on a non-list type.');

  var list = this.up().reference();

  return this.root.select(this.solvedPath.slice(0, -1).concat(list.length - 1));
};

Cursor.prototype.down = function() {
  var last = +this.solvedPath[this.solvedPath.length - 1];

  if (!(this.reference() instanceof Array))
    return null;

  return this.root.select(this.solvedPath.concat(0));
};

/**
 * Access
 */
Cursor.prototype.get = function(path) {
  if (arguments.length > 1)
    path = helpers.arrayOf(arguments);

  if (type.Step(path))
    return this.root.get(this.solvedPath.concat(path));
  else
    return this.root.get(this.solvedPath);
};

Cursor.prototype.reference = function(path) {
  if (arguments.length > 1)
    path = helpers.arrayOf(arguments);

  if (type.Step(path))
    return this.root.reference(this.solvedPath.concat(path));
  else
    return this.root.reference(this.solvedPath);
};

Cursor.prototype.clone = function(path) {
  if (arguments.length > 1)
    path = helpers.arrayOf(arguments);

  if (type.Step(path))
    return this.root.clone(this.solvedPath.concat(path));
  else
    return this.root.clone(this.solvedPath);
};

/**
 * Update
 */
Cursor.prototype.set = function(key, value) {
  if (arguments.length < 2)
    throw Error('baobab.Cursor.set: expecting at least key/value.');

  var spec = {};
  spec[key] = {$set: value};
  return this.update(spec);
};

Cursor.prototype.edit = function(value) {
  return this.update({$set: value});
};

Cursor.prototype.apply = function(fn) {
  if (typeof fn !== 'function')
    throw Error('baobab.Cursor.apply: argument is not a function.');

  return this.update({$apply: fn});
};

// TODO: maybe composing should be done here rather than in the merge
Cursor.prototype.thread = function(fn) {
  if (typeof fn !== 'function')
    throw Error('baobab.Cursor.thread: argument is not a function.');

  return this.update({$thread: fn});
};

// TODO: consider dropping the ahead testing
Cursor.prototype.push = function(value) {
  if (!(this.reference() instanceof Array))
    throw Error('baobab.Cursor.push: trying to push to non-array value.');

  if (arguments.length > 1)
    return this.update({$push: helpers.arrayOf(arguments)});
  else
    return this.update({$push: value});
};

Cursor.prototype.unshift = function(value) {
  if (!(this.reference() instanceof Array))
    throw Error('baobab.Cursor.push: trying to push to non-array value.');

  if (arguments.length > 1)
    return this.update({$unshift: helpers.arrayOf(arguments)});
  else
    return this.update({$unshift: value});
};

Cursor.prototype.merge = function(o) {
  if (!type.Object(o))
    throw Error('baobab.Cursor.merge: trying to merge a non-object.');

  if (!type.Object(this.reference()))
    throw Error('baobab.Cursor.merge: trying to merge into a non-object.');

  this.update({$merge: o});
};

Cursor.prototype.update = function(spec) {
  return this._stack(spec);
};

/**
 * Combination
 */
Cursor.prototype.or = function(otherCursor) {
  return new Combination('or', this, otherCursor);
};

Cursor.prototype.and = function(otherCursor) {
  return new Combination('and', this, otherCursor);
};

/**
 * Releasing
 */
Cursor.prototype.release = function() {
  this.root.off('update', this.updateHandler);
  this.root = null;
  this.unbindAll();
};

/**
 * Output
 */
Cursor.prototype.toJSON = function() {
  return this.reference();
};

type.Cursor = function (value) {
  return value instanceof Cursor;
};

/**
 * Export
 */
module.exports = Cursor;

},{"./combination.js":7,"./helpers.js":9,"./mixins.js":11,"./type.js":12,"emmett":4}],9:[function(require,module,exports){
/**
 * Baobab Helpers
 * ===============
 *
 * Miscellaneous helper functions.
 */
var type = require('./type.js');

// Make a real array of an array-like object
function arrayOf(o) {
  return Array.prototype.slice.call(o);
}

// Shallow merge
function shallowMerge(o1, o2) {
  var o = {},
      k;

  for (k in o1) o[k] = o1[k];
  for (k in o2) o[k] = o2[k];

  return o;
}

// Shallow clone
function shallowClone(item) {
  if (!item || !(item instanceof Object))
    return item;

  // Array
  if (type.Array(item))
    return item.slice(0);

  // Date
  if (type.Date(item))
    return new Date(item.getTime());

  // Object
  if (type.Object(item)) {
    var k, o = {};
    for (k in item)
      o[k] = item[k];
    return o;
  }

  return item;
}

// Deep clone
function deepClone(item) {
  if (!item || !(item instanceof Object))
    return item;

  // Array
  if (type.Array(item)) {
    var i, l, a = [];
    for (i = 0, l = item.length; i < l; i++)
      a.push(deepClone(item[i]));
    return a;
  }

  // Date
  if (type.Date(item))
    return new Date(item.getTime());

  // Object
  if (type.Object(item)) {
    var k, o = {};
    for (k in item)
      o[k] = deepClone(item[k]);
    return o;
  }

  return item;
}

// Simplistic composition
function compose(fn1, fn2) {
  return function(arg) {
    return fn2(fn1(arg));
  };
}

// Get first item matching predicate in list
function first(a, fn) {
  var i, l;
  for (i = 0, l = a.length; i < l; i++) {
    if (fn(a[i]))
      return a[i];
  }
  return;
}

function index(a, fn) {
  var i, l;
  for (i = 0, l = a.length; i < l; i++) {
    if (fn(a[i]))
      return i;
  }
  return -1;
}

// Compare object to spec
function compare(object, spec) {
  var ok = true,
      k;

  for (k in spec) {
    if (type.Object(spec[k])) {
      ok = ok && compare(object[k]);
    }
    else if (type.Array(spec[k])) {
      ok = ok && !!~spec[k].indexOf(object[k]);
    }
    else {
      if (object[k] !== spec[k])
        return false;
    }
  }

  return ok;
}

function firstByComparison(object, spec) {
  return first(object, function(e) {
    return compare(e, spec);
  });
}

function indexByComparison(object, spec) {
  return index(object, function(e) {
    return compare(e, spec);
  });
}

// Retrieve nested objects
function getIn(object, path) {
  path = path || [];

  var c = object,
      i,
      l;

  for (i = 0, l = path.length; i < l; i++) {
    if (!c)
      return;

    if (typeof path[i] === 'function') {
      if (!type.Array(c))
        return;

      c = first(c, path[i]);
    }
    else if (typeof path[i] === 'object') {
      if (!type.Array(c))
        return;

      c = firstByComparison(c, path[i]);
    }
    else {
      c = c[path[i]];
    }
  }

  return c;
}

// Solve a complex path
function solvePath(object, path) {
  var solvedPath = [],
      c = object,
      idx,
      i,
      l;

  for (i = 0, l = path.length; i < l; i++) {
    if (!c)
      return null;

    if (typeof path[i] === 'function') {
      if (!type.Array(c))
        return;

      idx = index(c, path[i]);
      solvedPath.push(idx);
      c = c[idx];
    }
    else if (typeof path[i] === 'object') {
      if (!type.Array(c))
        return;

      idx = indexByComparison(c, path[i]);
      solvedPath.push(idx);
      c = c[idx];
    }
    else {
      solvedPath.push(path[i]);
      c = c[path[i]];
    }
  }

  return solvedPath;
}

// Return a fake object relative to the given path
function pathObject(path, spec) {
  var l = path.length,
      o = {},
      c = o,
      i;

  if (!l)
    o = spec;

  for (i = 0; i < l; i++) {
    c[path[i]] = (i + 1 === l) ? spec : {};
    c = c[path[i]];
  }

  return o;
}

function inherits(ctor, superCtor) {
  ctor.super_ = superCtor;
  var TempCtor = function () {};
  TempCtor.prototype = superCtor.prototype;
  ctor.prototype = new TempCtor();
  ctor.prototype.constructor = ctor;
}

module.exports = {
  arrayOf: arrayOf,
  deepClone: deepClone,
  shallowClone: shallowClone,
  shallowMerge: shallowMerge,
  compose: compose,
  getIn: getIn,
  inherits: inherits,
  pathObject: pathObject,
  solvePath: solvePath
};

},{"./type.js":12}],10:[function(require,module,exports){
/**
 * Baobab Merge
 * =============
 *
 * A function used to merge updates in the stack.
 */
var helpers = require('./helpers.js'),
    type = require('./type.js');

// Helpers
function hasKey(o, key) {
  return key in (o || {});
}

function conflict(a, b, key) {
  return hasKey(a, key) && hasKey(b, key);
}

// Main function
function merge() {
  var res = {},
      current,
      next,
      l = arguments.length,
      i,
      k;

  for (i = l - 1; i >= 0; i--) {

    // Upper $set/$apply... and conflicts
    // When solving conflicts, here is the priority to apply:
    // -- 1) $set
    // -- 2) $merge
    // -- 3) $apply
    // -- 4) $chain
    if (arguments[i].$set) {
      delete res.$apply;
      delete res.$merge;
      res.$set = arguments[i].$set;
      continue;
    }
    else if (arguments[i].$merge) {
      delete res.$set;
      delete res.$apply;
      res.$merge = arguments[i].$merge;
      continue;
    }
    else if (arguments[i].$apply){
      delete res.$set;
      delete res.$merge;
      res.$apply = arguments[i].$apply;
      continue;
    }
    else if (arguments[i].$chain) {
      delete res.$set;
      delete res.$merge;

      if (res.$apply)
        res.$apply = helpers.compose(res.$apply, arguments[i].$chain);
      else
        res.$apply = arguments[i].$chain;
      continue;
    }

    for (k in arguments[i]) {
      current = res[k];
      next = arguments[i][k];

      if (current && type.Object(next)) {

        // $push conflict
        if (conflict(current, next, '$push')) {
          if (type.Array(current.$push))
            current.$push = current.$push.concat(next.$push);
          else
            current.$push = [current.$push].concat(next.$push);
        }

        // $unshift conflict
        else if (conflict(current, next, '$unshift')) {
          if (type.Array(next.$unshift))
            current.$unshift = next.$unshift.concat(current.$unshift);
          else
            current.$unshift = [next.$unshift].concat(current.$unshift);
        }

        // No conflict
        else {
          res[k] = merge(next, current);
        }
      }
      else {
        res[k] = next;
      }
    }
  }

  return res;
}

module.exports = merge;

},{"./helpers.js":9,"./type.js":12}],11:[function(require,module,exports){
/**
 * Baobab React Mixins
 * ====================
 *
 * Compilation of react mixins designed to deal with cursors integration.
 */
var Combination = require('./combination.js'),
    type = require('./type.js');

module.exports = {
  baobab: function(baobab) {
    return {

      // Run Baobab mixin first to allow mixins to access cursors
      mixins: [{
        getInitialState: function() {

          // Binding baobab to instance
          this.tree = baobab;

          // Is there any cursors to create?
          if (!this.cursor && !this.cursors)
            return {};

          // Is there conflicting definitions?
          if (this.cursor && this.cursors)
            throw Error('baobab.mixin: you cannot have both ' +
                        '`component.cursor` and `component.cursors`. Please ' +
                        'make up your mind.');

          // Type
          this.__type = null;

          // Making update handler
          this.__updateHandler = (function() {
            this.setState(this.__getCursorData());
          }).bind(this);

          if (this.cursor) {
            if (!type.MixinCursor(this.cursor))
              throw Error('baobab.mixin.cursor: invalid data (cursor, string or array).');

            if (!type.Cursor(this.cursor))
              this.cursor = baobab.select(this.cursor);

            this.__getCursorData = (function() {
              return {cursor: this.cursor.get()};
            }).bind(this);
            this.__type = 'single';
          }
          else if (this.cursors) {
            if (['object', 'array'].indexOf(type(this.cursors)) === -1)
              throw Error('baobab.mixin.cursor: invalid data (object or array).');

            if (type.Array(this.cursors)) {
              this.cursors = this.cursors.map(function(path) {
                return type.Cursor(path) ? path : baobab.select(path);
              });

              this.__getCursorData = (function() {
                return {cursors: this.cursors.map(function(cursor) {
                  return cursor.get();
                })};
              }).bind(this);
              this.__type = 'array';
            }
            else {
              for (var k in this.cursors) {
                if (!type.Cursor(this.cursors[k]))
                  this.cursors[k] = baobab.select(this.cursors[k]);
              }

              this.__getCursorData = (function() {
                var d = {};
                for (k in this.cursors)
                  d[k] = this.cursors[k].get();
                return {cursors: d};
              }).bind(this);
              this.__type = 'object';
            }
          }

          return this.__getCursorData();
        },
        componentDidMount: function() {
          if (this.__type === 'single') {
            this.__combination = new Combination('or', [this.cursor]);
            this.__combination.on('update', this.__updateHandler);
          }
          else if (this.__type === 'array') {
            this.__combination = new Combination('or', this.cursors);
            this.__combination.on('update', this.__updateHandler);
          }
          else if (this.__type === 'object') {
            this.__combination = new Combination(
              'or',
              Object.keys(this.cursors).map(function(k) {
                return this.cursors[k];
              }, this)
            );
            this.__combination.on('update', this.__updateHandler);
          }
        },
        componentWillUnmount: function() {
          if (this.__combination)
            this.__combination.release();
        }
      }].concat(baobab.options.mixins)
    };
  },
  cursor: function(cursor) {
    return {

      // Run cursor mixin first to allow mixins to access cursors
      mixins: [{
        getInitialState: function() {

          // Binding cursor to instance
          this.cursor = cursor;

          // Making update handler
          this.__updateHandler = (function() {
            this.setState({cursor: this.cursor.get()});
          }).bind(this);

          return {cursor: this.cursor.get()};
        },
        componentDidMount: function() {

          // Listening to updates
          this.cursor.on('update', this.__updateHandler);
        },
        componentWillUnmount: function() {

          // Unbinding handler
          this.cursor.off('update', this.__updateHandler);
        }
      }].concat(cursor.root.options.mixins)
    };
  }
};

},{"./combination.js":7,"./type.js":12}],12:[function(require,module,exports){
/**
 * Baobab Type Checking
 * =====================
 *
 * Misc helpers functions used throughout the library to perform some type
 * tests at runtime.
 */

// Not reusing methods as it will just be an extra
// call on the stack
var type = function (value) {
  if (Array.isArray(value)) {
    return 'array';
  } else if (typeof value === 'object' && value !== null) {
    return 'object';
  } else if (typeof value === 'string') {
    return 'string';
  } else if (typeof value === 'number') {
    return 'number';
  } else if (typeof value === 'boolean') {
    return 'boolean';
  } else if (typeof value === 'function') {
    return 'function';
  } else if (value === null) {
    return 'null';
  } else if (value === undefined) {
    return 'undefined';
  } else if (value instanceof Date) {
    return 'date';
  } else {
    return 'invalid';
  }
};

type.Array = function (value) {
  return Array.isArray(value);
};

type.Object = function (value) {
  return !Array.isArray(value) && typeof value === 'object' && value !== null;
};

type.String = function (value) {
  return typeof value === 'string';
};

type.Number = function (value) {
  return typeof value === 'number';
};

type.Boolean = function (value) {
  return typeof value === 'boolean';
};

type.Function = function (value) {
  return typeof value === 'function';
};

type.Primitive = function (value) {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
};

type.Date = function (value) {
  return value instanceof Date;
};

type.Step = function (value) {
  var valueType = type(value);
  var notValid = ['null', 'undefined', 'invalid', 'date'];
  return notValid.indexOf(valueType) === -1;
};

// Should undefined be allowed?
type.Path = function (value) {
  var types = ['object', 'string', 'number', 'function', 'undefined'];
  if (type.Array(value)) {
    for (var x = 0; x < value.length; x++) {
      if (types.indexOf(type(value[x])) === -1) {
        return false;
      }
    }
  } else {
    return types.indexOf(type(value)) >= 0;
  }
  return true;

};

// string|number|array|cursor
type.MixinCursor = function (value) {
  var allowedValues = ['string', 'number', 'array'];
  return allowedValues.indexOf(type(value)) >= 0 || type.Cursor(value);
};

// Already know this is an array
type.ComplexPath = function (value) {
  var complexTypes = ['object', 'function'];
  var hasComplexTypes = false;
  for (var x = 0; x < value.length; x++) {
    if (complexTypes.indexOf(type(value[x])) >= 0) {
      hasComplexTypes = true;
    }
  }
  return hasComplexTypes;
};

module.exports = type;

},{}],13:[function(require,module,exports){
/**
 * Baobab Update
 * ==============
 *
 * A handy method to mutate an atom according to the given specification.
 * Mostly inspired by http://facebook.github.io/react/docs/update.html
 */
var helpers = require('./helpers.js'),
    type = require('./type.js');

var COMMANDS = {};
[
  '$set',
  '$push',
  '$unshift',
  '$apply',
  '$merge'
].forEach(function(c) {
  COMMANDS[c] = true;
});

// Helpers
function makeError(path, message) {
  var e = new Error('precursors.update: ' + message + ' at path /' +
                    path.toString());

  e.path = path;
  return e;
}

// Core function
function update(target, spec, opts) {
  opts = opts || {};
  var log = {};

  // Closure mutating the internal object
  (function mutator(o, spec, path) {
    path = path || [];

    var hash = path.join('λ'),
        fn,
        h,
        k,
        v;

    for (k in spec) {
      if (COMMANDS[k]) {
        v = spec[k];

        // Logging update
        log[hash] = true;

        // Applying
        switch (k) {
          case '$push':
            if (!type.Array(o))
              throw makeError(path, 'using command $push to a non array');

            if (!type.Array(v))
              o.push(v);
            else
              o.push.apply(o, v);
            break;
          case '$unshift':
            if (!type.Array(o))
              throw makeError(path, 'using command $unshift to a non array');

            if (!type.Array(v))
              o.unshift(v);
            else
              o.unshift.apply(o, v);
            break;
        }
      }
      else {
        h = hash ? hash + 'λ' + k : k;

        if ('$set' in (spec[k] || {})) {
          v = spec[k].$set;

          // Logging update
          log[h] = true;
          o[k] = v;
        }
        else if ('$apply' in (spec[k] || {})) {
          fn = spec[k].$apply;

          if (typeof fn !== 'function')
            throw makeError(path.concat(k), 'using command $apply with a non function');

          // Logging update
          log[h] = true;
          o[k] = fn.call(null, o[k]);
        }
        else if ('$merge' in (spec[k] || {})) {
          v = spec[k].$merge;

          if (!type.Object(o[k]))
            throw makeError(path.concat(k), 'using command $merge on a non-object');

          // Logging update
          log[h] = true;
          o[k] = helpers.shallowMerge(o[k], v);
        }
        else if (opts.shiftReferences &&
                 ('$push' in (spec[k] || {}) ||
                  '$unshift' in (spec[k] || {}))) {
          if ('$push' in (spec[k] || {})) {
            v = spec[k].$push;

            if (!type.Array(o[k]))
              throw makeError(path.concat(k), 'using command $push to a non array');
            o[k] = o[k].concat(v);
          }
          if ('$unshift' in (spec[k] || {})) {
            v = spec[k].$unshift;

            if (!type.Array(o[k]))
              throw makeError(path.concat(k), 'using command $unshift to a non array');
            o[k] = (v instanceof Array ? v : [v]).concat(o[k]);
          }

          // Logging update
          log[h] = true;
        }
        else {

          // If nested object does not exist, we create it
          if (typeof o[k] === 'undefined')
            o[k] = {};

          // Shifting reference
          if (opts.shiftReferences)
            o[k] = helpers.shallowClone(o[k]);

          // Recur
          mutator(
            o[k],
            spec[k],
            path.concat(k)
          );
        }
      }
    }
  })(target, spec);

  return Object.keys(log).map(function(hash) {
    return hash.split('λ');
  });
}

// Exporting
module.exports = update;

},{"./helpers.js":9,"./type.js":12}],14:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],15:[function(require,module,exports){
/* global Blob */
/* global File */

function safeDeepClone(circularValue, refs, obj) {
  var copy;

  // object is a false or empty value, or otherwise not an object
  if (!obj || 'object' !== typeof obj || obj instanceof Error || obj instanceof ArrayBuffer || obj instanceof Blob || obj instanceof File) return obj;

  // Handle Date
  if (obj instanceof Date) {
    copy = new Date();
    copy.setTime(obj.getTime());
    return copy;
  }

  // Handle Array - or array-like items
  if (obj instanceof Array || obj.length) {
    
    refs.push(obj);
    copy = [];
    for (var i = 0, len = obj.length; i < len; i++) {
      if (refs.indexOf(obj[i]) >= 0) {
        copy[i] = circularValue;
      } else {
        copy[i] = safeDeepClone(circularValue, refs, obj[i]);
      }
    }
    refs.pop();
    return copy;
  }

  // Handle Object
  refs.push(obj);

  // Bring a long prototype
  if (obj.constructor && obj.constructor !== Object) {
    copy = Object.create(obj.constructor.prototype);
  } else {
    copy = {};
  }

  for (var attr in obj) {
    if (obj.hasOwnProperty(attr) && attr !== '$$hashKey') {
      if (refs.indexOf(obj[attr]) >= 0) {
        copy[attr] = circularValue;
      } else {
        copy[attr] = safeDeepClone(circularValue, refs, obj[attr]);
      }
    }
  }
  refs.pop();
  return copy;
}

module.exports = safeDeepClone;

},{}]},{},[1])(1)
});