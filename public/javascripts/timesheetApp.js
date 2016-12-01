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
  $scope.indices = {};
  $scope.entries = [];

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
      sheet_id: $scope.spreadsheet.id,
      indices: $scope.indices
    }});
    $scope.indices.lastEntryCell.row++;
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
  //return if empty
  if(!data) return;

  //col starts at 0(A) & rowIndex starts at 1 so 1 = first row
  var dateCol, updated;
  if(data.length > 0){
    for(rowIndex = 0; rowIndex < data.length; rowIndex++){
      var row = data[rowIndex];
        for(colIndex = 0; colIndex <= row.length; colIndex++){
          var col = row[colIndex];
          if(col === 'Date'){
            scope.indices.firstEntryCell = {row: rowIndex, col: colIndex};
            dateCol = colIndex;
          }

          if(col === 'Hours'){
            scope.indices.hoursCol = colIndex;
          }

          if(col === 'Description'){
            scope.indices.descCol = colIndex;
          }
        };

        if(scope.indices.firstEntryCell && rowIndex > scope.indices.firstEntryCell.row){
          //if we are in the entry section and we find an empty row, it is the last entry
          if((!row || row.length === 0) && !updated){

            //If the old last index is longer than the current one (user deleted some entries), then
            //we want to remove the extra elements.
            if(scope.indices.lastEntryCell && scope.indices.lastEntryCell.row > rowIndex){
              scope.entries.slice(0,rowIndex);
            }
            //now we'll update to the new index
            scope.indices.lastEntryCell = {row: rowIndex , col: dateCol};
            updated = true;
          }
          if(!updated){
            var obj = {
              date: data[rowIndex][dateCol],
              desc: data[rowIndex][scope.indices.descCol],
              hours: data[rowIndex][scope.indices.hoursCol]
            };

            scope.entries[rowIndex - scope.indices.firstEntryCell.row - 1] = obj;
            console.log('added obj at ' + rowIndex + ' date is ' + obj.date);
          }
      }
    };
  }
  console.log('updated');
}

function idOf(i) {
    return (i >= 26 ? idOf((i / 26 >> 0) - 1) : '') +
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[i % 26 >> 0];
}
