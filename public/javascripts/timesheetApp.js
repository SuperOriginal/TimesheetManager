var timesheetApp = angular.module('timesheetApp', ['ui.router','ngDialog']);

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

.controller('editController', function($scope, $interval, $location, $http, ngDialog){
  window.sco = $scope;
  window.ngd = ngDialog;
  $scope.accessToken = $location.search()['token'];
  $scope.indices = {};
  $scope.entries = [];
  $scope.spreadsheet = {};
  $scope.jobsheet = {};

  $scope.timer = {counter: 0, clock: undefined, currentTask: undefined};

  $scope.submitUrl = function(){
    $http.get('/api/spreadsheet', {params: {
      access_token: $scope.accessToken,
      sheet_id: $scope.spreadsheet.id
    }}).then(function(response){
      if(response && response !== ''){
        Cookies.set('sheeturl', $scope.spreadsheet.id, {expires: 7});
      }
      $scope.sheet_data = response;
      updateIndices(response.data.values, $scope);
    });
  }


  $scope.popup = function(){
    ngDialog.open({
      template: '/popup.html',
      scope: $scope
    });
  }

  $scope.addEntry = function(){
    $http.post('/api/spreadsheet', {params: {
      access_token: $scope.accessToken,
      sheet_id: $scope.spreadsheet.id,
      indices: $scope.indices,
      job: $scope.timer.currentTask,
      hours: $scope.timer.counter
    }}).then(function(response){
      if(response.data.result === 'success'){
        $scope.entries.push(response.data.data);
      }else{
        console.log(response.data.data);
      }
    });
    $scope.indices.lastEntryCell.row++;
  }

  $scope.parseJobs = function(){
    $http.get('/api/spreadsheet', {params: {
      access_token: $scope.accessToken,
      sheet_id: $scope.jobsheet.id
    }}).then(function(response){
      $scope.jobdata = response;
      if(response && response !== ''){
        Cookies.set('joburl', $scope.jobsheet.id, {expires: 7});
      }
      readJobs(response.data.values, $scope);
    });
  }

  $scope.timer.beginTask = function(currentTask){
    $scope.timer.currentTask = currentTask;
    $scope.timer.clock = $interval(function(){
      $scope.timer.counter++;
    },1000);
    ngDialog.closeAll();
  }

  $scope.timer.cancelTask = function(){
    $scope.timer.pauseTask();
    $scope.timer.counter = 0;
    $scope.timer.currentTask = undefined;
  }

  $scope.timer.pauseTask = function(){
    $interval.cancel($scope.timer.clock);
  }

  $scope.timer.endTask = function(){
    $scope.addEntry();
    $scope.timer.cancelTask();
  }

  var init = function () {
    var jobsurl = Cookies.get('joburl');
    if(jobsurl){
      $scope.jobsheet.id = jobsurl;
      $scope.parseJobs();
    }

    var sheeturl = Cookies.get('sheeturl');
    if(sheeturl){
      $scope.spreadsheet.id = sheeturl;
      $scope.submitUrl();
    }
  };
  init();

})

.filter('secondsToDateTime', function() {
    return function(seconds) {
        var d = new Date(0,0,0,0,0,0,0);
        d.setSeconds(seconds);
        return d;
    };
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

//read cells in the time sheet to update index variables for reference
function updateIndices(data, scope){
  //return if empty
  if(!data) return;

  var dateCol, updated = false;
  if(data.length > 0){
    for(var rowIndex = 0; rowIndex < data.length; rowIndex++){
      var row = data[rowIndex];
      for(var colIndex = 0; colIndex <= row.length; colIndex++){
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
      }

      if(scope.indices.firstEntryCell && rowIndex > scope.indices.firstEntryCell.row){
          //if we are in the entry section and we find an empty row, it is the last entry
        if((!row || row.length === 0) && !updated){

            //If the old last index is longer than the current one (user deleted some entries), then
            //we want to remove the extra elements.
          if(scope.indices.lastEntryCell && scope.indices.lastEntryCell.row > rowIndex){
            scope.entries.splice(rowIndex - scope.indices.firstEntryCell.row - 1);
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
        }
      }
    }
  }
}

//parse the job & task spreadsheet
function readJobs(data, scope){
  if(!data) return;

  var jobs = {};

  for(var rowIndex = 0; rowIndex < data.length; rowIndex++){
    var row = data[rowIndex];
    for(var colIndex = 0; colIndex <= row.length; colIndex++){
      var col = row[colIndex];
      if(col){
        if(rowIndex === 0){
          var split = col.split(':');
          jobs[split[0]] = {number: split[0], desc: split[1].toUpperCase(), tasks:[]};
        }else{
          jobs[data[0][colIndex].split(':')[0]].tasks.push(col);
        }
      }
    }
  }

  scope.jobs = jobs;
}
