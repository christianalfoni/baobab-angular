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
