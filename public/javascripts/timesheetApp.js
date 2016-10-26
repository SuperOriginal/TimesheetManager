var app = angular.module('timesheetApp')

.config(function($stateProvider, $locationProvider) {

  //$locationProvider.html5Mode(true);

  var loginState = {
    name: 'login',
    url: '/login',
    templateUrl: 'signin.html'
    controller: 'authController as authCtrl'
  }

  var mainState = {
    name: 'main',
    url: '/',
    templateUrl: 'main.html'
  }

  $stateProvider.state(loginState);
  $stateProvider.state(mainState);
  console.log('set states');
});

.controller('authController', function($scope, $http){
  console.log('set controller');
  $scope.login = function(){
    $http.post('/auth/login')
  }
})


.run(function($rootScope){
  console.log('ran');
  $rootScope.authenticated = false;
  $rootScope.currentUser = '';

  $rootScope.signout = function(){
    	$http.get('/auth/signout');
    	$rootScope.authenticated = false;
    	$rootScope.current_user = '';
	};
});
