var express = require('express');
var google = require('googleapis');
var refresh = require('passport-oauth2-refresh');
var sheets = google.sheets('v4');
var router = express.Router();

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated())
  return next();

  res.redirect('/');
}

router.use(isAuthenticated);

//get all cells in spreadsheet
router.get('/spreadsheet', function(req, res){
  var retries = 5;
  var params = req.query;

  var sheetId = params['sheet_id'];

  var sendError = function(error){
    return res.json({result:'error', data:error});
  }

  if(!sheetId){
    return sendError('URL not specified');
  }

  if(!req.isAuthenticated()){
    return sendError('Not authenticated to make this action');
  }

  var retried = false;
  var makeRequest = function(accessToken, refreshToken){
    retries--;
    if(!retries) {
      // Couldn't refresh the access token.
      return sendError('Failed to refresh access token');
    }
    getSheet(accessToken, sheetId, function(err, resp){
      if(err){
        if(err.code === 401){
          refresh.requestNewAccessToken('google', refreshToken, function(tokenError, newAccessToken, newRefreshToken) {
            if(tokenError || !newAccessToken){
              return sendError(tokenError);
            }
            retried = true;
            makeRequest(newAccessToken, newRefreshToken);
          });
        }else{
          return sendError(err.code + ': ' + err.message);
        }
      }else{
        if(!headerExists(resp.values)){
          writeHeader(accessToken, sheetId, function(err, res){
            if(err){
              return sendError('Failed to write header');
            }
          });
        }
        if(retried){
          req.login({accessToken: accessToken, refreshToken: refreshToken}, function(err){
            if(err)
            return sendError(err);
          });
        }
        return res.json({
          result: 'success',
          data: resp
        });
      }
    });
  }
  makeRequest(req.user.accessToken, req.user.refreshToken);
});

//create new entry in spreadsheet
router.post('/spreadsheet', function(req, res){
  var sheetId = req.body.params.sheet_id;
  var indices = req.body.params.indices;

  var job = req.body.params.job;
  var task = req.body.params.job.task;
  var seconds = req.body.params.hours*100;
  var date = new Date().toLocaleDateString();

  var sendError = function(error){
    return res.json({result:'error', data:error});
  }

  if(!sheetId){
    return sendError('URL not specified');
  }

  if(seconds < 360){
    return sendError('Work time not long enough');
  }

  if(!job || !task || !seconds){
    return sendError('Required variables are missing');
  }

  var retried = false;
  var retries = 5;
  var makeRequest = function(accessToken, refreshToken){

    retries--;
    if(!retries) {
      // Couldn't refresh the access token.
      return sendError('No more retries');
    }

    var info = {
      date: date,
      job: {
        name: job.job.split(':')[1].substring(1),
        number: job.job.split(':')[0].substring(1),
      },
      desc: task,
      hours: round(convertToHours(seconds),1)
    }

    writeSheet(accessToken, sheetId, indices, info, function(err, resp){
      if(err){
        if(err.code === 401){
          refresh.requestNewAccessToken('google', refreshToken
          , function(tokenError, newAccessToken, newRefreshToken) {
            if(tokenError || !newAccessToken){
              return sendError(tokenError);
            }
            retried = true;
            makeRequest(newAccessToken, newRefreshToken);
          });
        }else{
          return sendError(err.code + ': ' + err.message);
        }
      }else{
        if(retried){
          req.login({accessToken: accessToken, refreshToken: refreshToken}, function(err){
            if(err)
            return sendError(err);
          });
        }
        return res.json({result: 'success', data: info});
    }

  });
}
makeRequest(req.user.accessToken, req.user.refreshToken);
});


function headerExists(data){
  return data && data[0];
}

function getHeaderRequest(){
  var requests = [];
  requests.push({
    updateCells: {
      start: {
        sheetId: 0,
        rowIndex: 0,
        columnIndex: 0
      },
      rows: [{
        values: [{
          userEnteredValue: {stringValue: 'Date'},
          userEnteredFormat: {
            horizontalAlignment: 'CENTER',
            textFormat: {bold: true}
          }
        },
        {
          userEnteredValue: {stringValue: 'Job Number'},
          userEnteredFormat: {
            horizontalAlignment: 'CENTER',
            textFormat: {bold: true}
          }
        },
        {
          userEnteredValue: {stringValue: 'Job Name'},
          userEnteredFormat: {
            horizontalAlignment: 'CENTER',
            textFormat: {bold: true}
          }
        },
        {
          userEnteredValue: {stringValue: 'Description'},
          userEnteredFormat: {
            horizontalAlignment: 'CENTER',
            textFormat: {bold: true}
          }
        },
        {
          userEnteredValue: {stringValue: 'Hours'},
          userEnteredFormat: {
            horizontalAlignment: 'CENTER',
            textFormat: {bold: true}
          }
        }]
      }],
      fields: 'userEnteredValue,userEnteredFormat(horizontalAlignment,textFormat)'
    }
  });

  requests.push({
    updateBorders: {
      range: {
        sheetId: 0,
        startRowIndex: 0,
        endRowIndex: 1,
        startColumnIndex: 0,
        endColumnIndex: 5
      },
      right: {
        style: 'SOLID',
        width: 1,
        color:{
          red: 0,
          green: 0,
          blue: 0
        }
      },
      bottom: {
        style: 'SOLID',
        width: 1,
        color:{
          red: 0,
          green: 0,
          blue: 0
        }
      },
    }
  });

  return requests;
};

function writeHeader(token, sheetid, callback){
  sendBatchUpdateRequest({
    access_token: token,
    spreadsheetId: sheetid,
    resource: {
      requests: getHeaderRequest()
    }
  }, function(err, res){
    callback(err,res);
  });
}

function sendBatchUpdateRequest(options, callback){
  sheets.spreadsheets.batchUpdate(options, function(err, res){
    callback(err, res);
  })
}

function writeSheet(auth, id, indices, data, callback){
  var requests = [];
  var row = indices.lastEntryCell.row, col = indices.lastEntryCell.col;
  //write entry
  requests.push({
    updateCells: {
      start: {
        sheetId: 0,
        rowIndex: row-1,
        columnIndex: col
      },
      rows: [{
        values: [{
          userEnteredValue: {stringValue: data.date},
          userEnteredFormat: {horizontalAlignment: 'CENTER'}
        },
        {
          userEnteredValue: {numberValue: data.job.number},
          userEnteredFormat: {horizontalAlignment: 'CENTER'}
        },
        {
          userEnteredValue: {stringValue: data.job.name},
          userEnteredFormat: {horizontalAlignment: 'CENTER'}
        },
        {
          userEnteredValue: {stringValue: data.desc},
          userEnteredFormat: {horizontalAlignment: 'CENTER'}
        },
        {
          userEnteredValue: {numberValue: data.hours},
          userEnteredFormat: {horizontalAlignment: 'CENTER'}
        }]
      }],
      fields: 'userEnteredValue,userEnteredFormat(horizontalAlignment)'
    }
  });

  requests.push({
    autoResizeDimensions: {
      dimensions:{
        sheetId: 0,
        dimension: 'COLUMNS',
        startIndex: 0,
        endIndex: 5
      }
    }
  });

  var batchUpdateRequest = {requests: requests}

  var options = {
    access_token: auth,
    spreadsheetId: id,
    resource: batchUpdateRequest
  }

  sendBatchUpdateRequest(options, function(err, res){
    callback(err, res);
  })
}

//use api to retrieve sheet data from cells A1 to F200 - arbitrary numbers, should be good enough
function getSheet(auth, id, callback) {
  sheets.spreadsheets.values.get({
    access_token: auth,
    spreadsheetId: id,
    range: 'Sheet1!A1:F200'
  }, function(err, response) {
    if (err) {
      callback(err,null);
      return;
    }
    callback(null,response);
  });
}

function round(value, decimals) {
  return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
}

function convertToHours(sec){
  return sec/60/60;
}
module.exports = router;
