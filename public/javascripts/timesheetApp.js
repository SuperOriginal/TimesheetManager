var app = angular.module('timesheetApp').run(function($rootScope){
  $rootScope.authenticated = false;
  $rootScope.currentUser = '';

  $rootScope.signout = function(){
    	$http.get('auth/signout');
    	$rootScope.authenticated = false;
    	$rootScope.current_user = '';
	};
});

app.config(function($stateProvider) {
  var loginState = {
    name: 'login',
    url: '/login',
    template: 'signin.html'
  }

  var mainState = {
    name: 'main',
    url: '/',
    template: 'index.html'
  }

  $stateProvider.state(helloState);
  $stateProvider.state(aboutState);
});

app.controller('authController', function($scope){

});
