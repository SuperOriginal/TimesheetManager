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

  var makeRequest = function(accessToken, refreshToken){
    retries--;
    if(!retries) {
      // Couldn't refresh the access token.
      return sendError('No more retries');
    }
    getSheet(accessToken, sheetId, function(err, resp){
      if(err){
        if(err.code === 401){
          refresh.requestNewAccessToken('google', refreshToken, function(tokenError, newAccessToken, newRefreshToken) {
            if(tokenError || !newAccessToken){
              console.log(tokenError);
              return sendError(tokenError);
            }
            makeRequest(newAccessToken, newRefreshToken);
          });
        }else{
          return res.json({
            result: 'error',
            data: 'error getting sheet data'
          });
        }
      }else{
        if(!headerExists(resp.values)){
            writeHeader(accessToken, sheetId, function(err, res){
              if(err){
                return res.json({
                  result: 'error',
                  data: 'error writing header'
                });
              }
            });
        }
        req.login({accessToken: accessToken, refreshToken: refreshToken}, function(err){
          if(err)
          sendError(err);
        });
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
  var seconds = req.body.params.hours;
  var date = new Date().toLocaleDateString();

  if(seconds < 360){
    return res.json({
      result: 'error',
      data: 'not enough time'
    });
  }

  if(!job || !task){
    return res.json({
      result: 'error',
      data: 'missing variables'
    });
  }

  writeSheet(req.user.accessToken, sheetId, indices, info = {date: date, job: {name: job.job.split(':')[1].substring(1), number: job.job.split(':')[0].substring(1) }, task: task, hours: round(convertToHours(seconds),1)}, function(err, resp){
    if(err){
      return res.json({result: 'error', data: err});
    }else{
      return res.json({result: 'success', data: info});
    }
  });

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
        rowIndex: row,
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
      console.log('The API returned an error(' + err.code + '): ' + err);
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
