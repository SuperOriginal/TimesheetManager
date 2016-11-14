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
    $http.get('/api/spreadsheet', {params: {
      access_token: $scope.accessToken,
      sheet_id: $scope.spreadsheet.id
    }}).then(function(response){
      $scope.sheet_data = response;
      updateIndices(response.data.values, $scope);
    });
  }

  $scope.addEntry = function(){
    $http.post('/api/spreadsheet', {params: {
      access_token: $scope.accessToken,
      sheet_id: $scope.spreadsheet.id
    }});
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

//read cells in the sheet to update index variables for reference
function updateIndices(data, scope){
  scope.firstEntryCell = null;
  scope.lastEntryCell = null;
  //return if empty
  if(!data) return;

  //col starts at 0(A) & rowIndex starts at 1 so 1 = first row
  var dateCol;
  if(data.length > 0){
    for(rowIndex = 0; rowIndex < data.length; rowIndex++){
      var row = data[rowIndex];
        for(colIndex = 0; colIndex <= row.length; colIndex++){
          var col = row[colIndex];
          if(col === 'Date'){
            //cell will be in A1 format
            scope.firstEntryCell = idOf(colIndex) + (rowIndex + 1);
            dateCol = colIndex;
          }

          if(scope.firstEntryCell){
            if(scope.lastEntryCell){
              return;
            }
            //if we are in the entry section and we find an empty row, it is the last entry
            console.log(row);
            if(!row || row.length === 0){
              scope.lastEntryCell = idOf(dateCol) + (rowIndex);
            }
          }
        };
    };
  }
}

function idOf(i) {
    return (i >= 26 ? idOf((i / 26 >> 0) - 1) : '') +
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[i % 26 >> 0];
}
