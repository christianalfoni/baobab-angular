# baobab-angular
A state handling library for Angular, based on Baobab

```js
angular.module('app', ['baobab'])
  .tree('myTree', function () {
    return {
      todos: []
    };
  })
  .controller('MyCtrl', function ($scope, myTree) {
    
    $scope.todos = myTree.select('todos').get();

    $scope.addTodo = function () {
      myTree.todos.push('foo');
    };
  
    $scope.$listenTo(myTree.todos, function () {
      $scope.todos = myTree.select('todos').get();
    });

  });
```
