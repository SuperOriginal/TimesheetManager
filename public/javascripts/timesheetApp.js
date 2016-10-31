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
    templateUrl: 'edit.html',
    controller: 'editController as editCtrl'
  });
})

.controller('authController', function($scope, $window){
  $scope.login = function(){
    $window.location.href = '/auth/google';
  }
})

.controller('editController', function($scope, $location, $http){
  $scope.accessToken = $location.search()['token'];

  $scope.submitUrl = function(){
    $http.get('/api/test', {params: {
      access_token: $scope.accessToken,
      sheet_id: $scope.spreadsheet.id
    }}).then(function(response){
      $scope.sheet_data = response;
    });
  }
})

.run(function($rootScope, $http){
  $rootScope.authenticated = false;
  $rootScope.currentUser = '';

  $rootScope.logout = function(){
    $http.get('/auth/logout');
    $rootScope.authenticated = false;
    $rootScope.current_user = '';
  };
});
