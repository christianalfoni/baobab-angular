'use strict';

// When requiring Angular it is added to global for some reason
var angular = global.angular || require('angular') && global.angular;
var Baobab = require('baobab');
var safeDeepClone = require('./safeDeepClone.js');

// Flux Service is a wrapper for the Yahoo Dispatchr
var BaobabService = function () {
  
  this.createTree = function (tree) {
    return new Baobab(tree, {
      clone: true,
      cloningFunction: function (obj) {
        return safeDeepClone('[circular]',[], obj);
      }
    });
  };

};



// Monkeypatch angular module (add .store)

// Wrap "angular.module" to attach store method to module instance
var angularModule = angular.module;
angular.module = function () {

  // Call the module as normaly and grab the instance
  var moduleInstance = angularModule.apply(angular, arguments);

  // Attach store method to instance
  moduleInstance.tree = function (treeName, treeDefinition) {

    // Create a new store
    this.factory(treeName, ['$injector', 'baobab', '$rootScope', function ($injector, baobab, $rootScope) {

      var tree = $injector.invoke(treeDefinition);
      var instance = baobab.createTree(tree);
      instance.on('update', function () {
        setTimeout(function () {
          $rootScope.$apply();
        }, 0);
      });
      return instance;

    }]);

    return this;

  };

  return moduleInstance;

};

angular.module('baobab', [])
  .provider('baobab', function FluxProvider () {
    this.$get = [function fluxFactory () {
      return new BaobabService();
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
