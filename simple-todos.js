Tasks = new Mongo.Collection('tasks');

if (Meteor.isClient) {

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });

  angular.module('simple-todos',['angular-meteor']);

  function onReady() {
    angular.bootstrap(document, ['simple-todos']);
  }

  if (Meteor.isCordova)
    angular.element(document).on('deviceready', onReady);
  else
    angular.element(document).ready(onReady);

  angular.module('simple-todos').controller('TodosListCtrl', ['$scope', '$meteor',
    function ($scope, $meteor) {

      $scope.$meteorSubscribe('tasks');

      $scope.tasks = $meteor.collection(function() {
        return Tasks.find($scope.getReactively('query'), {sort: {createdAt: -1}})
      });

      $scope.addTask = function(newTask) {
        $meteor.call('addTask', newTask);
      };

      $scope.deleteTask = function(task) {
        $meteor.call('deleteTask', task._id);
      };

      $scope.setChecked = function(task) {
        $meteor.call('setChecked', task._id, !task.checked);
      };

      $scope.setPrivate = function(task) {
        $meteor.call('setPrivate', task._id, !task.private);
      }

      $scope.$watch('hideCompleted', function() {
        if ($scope.hideCompleted)
          $scope.query = {checked: {$ne: true}};
        else
          $scope.query = {};
      });

      $scope.incompleteCount = function () {
        return Tasks.find({ checked: {$ne: true} }).count();
      };
    }
  ]);
}

Meteor.methods({
  addTask: function(text) {
    var owner, username;
    
    if (!Meteor.userId()) { // not safe
      owner = "anon";
      username = "anonymous";
    } else {
      owner = Meteor.userId();
      username = Meteor.user().username;
    }

    Tasks.insert({
      text: text,
      createdAt: new Date(),
      owner: owner,
      username: username
    });
  },
  deleteTask: function(taskId) {
    var task = Tasks.findOne(taskId);
    if (task.owner !== Meteor.userId() && typeof task.owner !== 'undefined') {
      alert('Only the owner can delete the task'); // change it
      throw new Meteor.Error('not-autohorized');
    }

    Tasks.remove(taskId);
  },
  setChecked: function(taskId, setChecked) {
    var task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
      throw new Meteor.Error('not-autohorized');
    }

    Tasks.update(taskId, {$set: {checked: setChecked}});
  },
  setPrivate: function(taskId, setToPrivate) {
    var task = Tasks.findOne(taskId);

    if (task.owner !== Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    Tasks.update(taskId, {$set: {private: setToPrivate}});
  }
});

if (Meteor.isServer) {
  Meteor.publish('tasks', function () {
    return Tasks.find({
      $or: [
        {private: {$ne: true}},
        {owner: this.userId}
      ]
    });
  });
}