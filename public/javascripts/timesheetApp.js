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

.controller('authController', function($scope, $window, $http, $location){
  $scope.login = function(){
    $window.location.href = '/auth/google';
  }

  $http.get('/auth/authenticated').then(function(response){
  if(response.data.authenticated)
    $location.path('edit');
  });
})

.controller('editController', function($scope, $interval, $location, $http, ngDialog){
  window.sco = $scope;
  window.ngd = ngDialog;
  $scope.accessToken = $location.search()['token'];
  $scope.indices = {lastEntryCell:{row:1, col:0}};
  $scope.entries = [];
  $scope.spreadsheet = {};
  $scope.jobsheet = {};

  $scope.timer = {counter: 0, clock: undefined, currentTask: undefined};

  $scope.submitUrl = function(){
    $http.get('/api/spreadsheet', {params: {
      sheet_id: $scope.spreadsheet.id
    }}).then(function(response){
      if(response.data.result === 'success'){
        Cookies.set('sheeturl', $scope.spreadsheet.id, {expires: 7});
        $scope.sheet_data = response;
        updateIndices(response.data.data.values, $scope);
      }else{
        //TODO ERROR POPUP
        console.log(response.data.data);
      }
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
      sheet_id: $scope.spreadsheet.id,
      indices: $scope.indices,
      job: $scope.timer.currentTask,
      hours: $scope.timer.counter
    }}).then(function(response){
      if(response.data.result === 'success'){
        $scope.entries.push(response.data.data);
      }else{
        //TODO ERROR POPUP
        console.log(response.data.data);
      }
    });
    $scope.indices.lastEntryCell.row++;
  }

  $scope.parseJobs = function(){
    $http.get('/api/spreadsheet', {params: {
      sheet_id: $scope.jobsheet.id
    }}).then(function(response){
      if(response.data.result === 'success'){
        $scope.jobdata = response;
        Cookies.set('joburl', $scope.jobsheet.id, {expires: 7});
        readJobs(response.data.data.values, $scope);
      }else{
        //TODO ERROR POPUP
        console.log(response.data.data);
      }
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

  var dateCol = 0,
  updated = false,
  firstEntryRow = 0;

  if(data.length > 0){
    //Start at second row since first is header
    for(var rowIndex = 1; rowIndex <= data.length; rowIndex++){
      var row = data[rowIndex];
        if(rowIndex > firstEntryRow){
          //if we are in the entry section and we find an empty row, it is the last entry
          if((!row || row.length === 0) || (rowIndex === data.length)){
            //now we'll update to the new index
            scope.indices.lastEntryCell = {row: rowIndex, col: dateCol};
            break;
          }
          var obj = {
            date: row[dateCol],
            job: {
              number: row[dateCol+1],
              name: row[dateCol+2]
            },
            desc: row[dateCol+3],
            hours: row[dateCol+4]
          };

          scope.entries.push(obj);
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
