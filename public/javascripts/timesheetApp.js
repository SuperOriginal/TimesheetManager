var timesheetApp = angular.module('timesheetApp', ['ui.router']);

timesheetApp.config(function($stateProvider, $locationProvider, $urlRouterProvider) {

  $urlRouterProvider.otherwise('/');

  $locationProvider.html5Mode(true);

  $stateProvider.state('login', {
    url: '/',
    templateUrl: 'signin.html',
    controller: 'authController as authCtrl'
  });
  $stateProvider.state('edit',{
    url: '/edit',
    templateUrl: 'edit.html'
  });
})

.controller('authController', function($scope, $window){
  $scope.login = function(){
    $window.location.href = '/auth/google';
  }
})

.run(function($rootScope, $http){
  $rootScope.authenticated = false;
  $rootScope.currentUser = '';

  $rootScope.signout = function(){
    $http.get('/auth/signout');
    $rootScope.authenticated = false;
    $rootScope.current_user = '';
  };
});