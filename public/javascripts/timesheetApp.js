var timesheetApp = angular.module('timesheetApp', ['ui.router','ngDialog', 'ngCookies']);

timesheetApp.config(function($stateProvider, $locationProvider, $urlRouterProvider) {

  $urlRouterProvider.otherwise('/');

  $locationProvider.html5Mode(true);

  $stateProvider.state('login', {
    url: '/',
    templateUrl: 'signin.html',
    controller: 'authController as authCtrl'
  });
  $stateProvider.state('settings', {
    url: '/settings',
    templateUrl: 'settings.html',
    controller: 'editController as editCtrl'
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

.controller('editController', function($scope, $rootScope, $interval, $location, $http, $cookies, ngDialog){
  $http.get('/auth/authenticated').then(function(response){
    if(!response.data.authenticated)
    $location.path('/');
    return;
  });

  $rootScope.requestPermission();

  window.sco = $rootScope;
  window.ngd = ngDialog;
  $scope.accessToken = $location.search()['token'];
  $scope.indices = {lastEntryCell:{row:1, col:0}};
  $scope.entries = [];
  $scope.spreadsheet = {};
  $scope.jobsheet = {};

  var openReminder = undefined;

  $scope.success = success;

  $scope.edit = function(){
    $location.url('/edit');
  }

  $scope.settings = function(){
    $location.url('/settings');
  }

  $scope.updateReminder = function(){
    $cookies.put('reminder', $rootScope.remind.interval, {expires: new Date(Date.now() + 1000*60*60*24*7)});
  }

  $scope.parseJobs = function(){
    $http.get('/api/spreadsheet', {params: {
      sheet_id: $scope.jobsheet.id
    }}).then(function(response){
      if(response.data.result === 'success'){
        $scope.jobdata = response;
        $cookies.put('joburl', $scope.jobsheet.id, {expires: new Date(Date.now() + 1000*60*60*24*7)});
        readJobs(response.data.data.values, $scope);
      }else{
        err(response.data.data);
      }
    });
  }

  $scope.submitUrl = function(){
    $http.get('/api/spreadsheet', {params: {
      sheet_id: $scope.spreadsheet.id
    }}).then(function(response){
      if(response.data.result === 'success'){
        $cookies.put('sheeturl', $scope.spreadsheet.id, {expires: new Date(Date.now() + 1000*60*60*24*7)});
        updateIndices(response.data.data.values, $scope);
      }else{
        err(response.data.data);
      }
    });
  }

  $scope.popup = function(){
    if($scope.jobs){
      ngDialog.open({
        template: '/popup.html',
        scope: $scope
      });
    }else{
      err('Jobs URL not set');
    }
  }

  $scope.addEntry = function(){
    $http.post('/api/spreadsheet', {params: {
      sheet_id: $scope.spreadsheet.id,
      indices: $scope.indices,
      job: $rootScope.timer.currentTask,
      hours: $rootScope.timer.counter
    }}).then(function(response){
      if(response.data.result === 'success'){
        $scope.entries.push(response.data.data);
      }else{
        err(response.data.data);
      }
    });
    $scope.indices.lastEntryCell.row++;
  }

  $rootScope.timer.beginTask = function(currentTask){
    $rootScope.timer.currentTask = currentTask;
    $rootScope.timer.resumeTask();
    ngDialog.closeAll();
  }

  $rootScope.timer.cancelTask = function(popup){
    if(popup){
      swal({
        title: 'Are you sure?',
        text: 'Time currently logged will be lost',
        type: 'warning',
        showCancelButton: true,
        confirmButtonText: 'I\'m Sure',
        reverseButtons: true
      }).then(function () {
        $rootScope.timer.pauseTask();
        $rootScope.timer.counter = 0;
        $rootScope.timer.currentTask = undefined;
        $rootScope.$apply();
      });
    }else{
      $rootScope.timer.pauseTask();
      $rootScope.timer.counter = 0;
      $rootScope.timer.currentTask = undefined;
    }
  }

  $rootScope.timer.pauseTask = function(){
    $rootScope.timer.paused = true;
    $interval.cancel($rootScope.timer.clock);
  }

  $rootScope.timer.resumeTask = function(){
    $rootScope.timer.paused = false;
    $rootScope.timer.clock = $interval(function(){
      $rootScope.timer.counter++;
      if($rootScope.remind.interval > 10 && $rootScope.timer.counter % $rootScope.remind.interval === 0){
        remind($rootScope, ngDialog, $rootScope);
      }
    },1000);
  }

  $rootScope.timer.endTask = function(){
    $rootScope.addEntry();
    $rootScope.timer.cancelTask(false);
    ngDialog.closeAll();
  }

  var remind = function(scope, dialog, root){
    root.showNotification();
    if(!openReminder){
      openReminder = ngDialog.openConfirm({
        template: '/reminder.html',
        scope: scope,
        preCloseCallback: function(val){
          openReminder = undefined;
        }
      });
    }
  }

  var init = function () {
    var jobsurl = $cookies.get('joburl');
    if(jobsurl){
      $scope.jobsheet.id = jobsurl;
      $scope.parseJobs();
    }

    var sheeturl = $cookies.get('sheeturl');
    if(sheeturl){
      $scope.spreadsheet.id = sheeturl;
      $scope.submitUrl();
    }

    var remindInterval = $cookies.get('reminder');
    if(remindInterval) $rootScope.remind.interval = remindInterval;
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

.run(function($rootScope, $http, $location, $cookies, $window){
  $rootScope.formSubmitting = false;
  $rootScope.setFormSubmitting = function(){
    $rootScope.formSubmitting = true;
  }
  $window.onload = function() {
    $window.addEventListener("beforeunload", function (e) {
      if(!$rootScope.timer.currentTask || $rootScope.formSubmitting){
        return undefined;
      }

      var confirmationMessage = 'The timer is running!'
      + 'If you leave before stopping the timer, time will be lost.';

      (e || $window.event).returnValue = confirmationMessage; //Gecko + IE
      return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
    });
  };

  $window.notify.config({pageVisibility: true, autoClose: 60000});
  $rootScope.permissionLevel = $window.notify.permissionLevel();
  $rootScope.permissionsGranted = ($rootScope.permissionLevel===notify.PERMISSION_GRANTED);
  $rootScope.requestPermission = function() {
    if ($rootScope.permissionLevel === $window.notify.PERMISSION_DEFAULT) {
      $window.notify.requestPermission(function() {
        $rootScope.$apply($rootScope.permissionLevel = $window.notify.permissionLevel());
        $rootScope.$apply($rootScope.permissionsGranted = ($rootScope.permissionLevel === $window.notify.PERMISSION_GRANTED));
      });
    }
  }

  $rootScope.showNotification = function() {
    $window.notify.createNotification('Timesheet', {
      body: 'Are you still working?',
      icon: 'images/pencil.ico'
    });
  }

  $rootScope.timer = {counter: 0, clock: undefined, currentTask: undefined};
  $rootScope.remind = {interval: -1}
  $rootScope.logout = function(){
    swal({
      title: 'Logout?',
      type: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes',
      reverseButtons: true
    }).then(function () {
      $http.get('/auth/logout').then(function(response){
        $cookies.remove('joburl');
        $cookies.remove('sheeturl');
        $cookies.remove('reminder');
        $location.path('/');
      });
    });
  }});

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
          scope.entries[rowIndex-1] = obj;
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

  function err(msg){
    swal(
      'Error',
      msg,
      'error'
    );
  }

  function success(msg){
    swal(
      'Success',
      msg,
      'success'
    )
  }
