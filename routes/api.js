var express = require('express');
var google = require('googleapis');
var sheets = google.sheets('v4');
var router = express.Router();

//get all cells in spreadsheet
router.get('/spreadsheet', function(req, res){
  var params = req.query;

  var sheetId = params['sheet_id'];
  var accessToken = params['access_token'];
  getSheet(accessToken, sheetId, function(err, resp){
    if(err){
      res.redirect('/#error');
    }else{
      res.json(resp);
    }
  });
});

//create new entry in spreadsheet
router.post('/spreadsheet', function(req, res){
  var sheetId = req.body.params.sheet_id;
  var accessToken = req.body.params.access_token;

  //TODO get required variables
  // var firstIndex = params['first-index'];
  // var lastIndex = params['last-index'];
  // var desc = params['desc'];
  // var hours = params['hours'];
  var date = new Date().toLocaleDateString();

  //TODO Write entry to GoogleSheets and shift footer down
  writeSheet(accessToken, sheetId, 'A1', ['Test'], function(err, res){
    if(err){
      console.log('error: ' + err);
    }else{
      console.log('success');
    }
  });

});

function writeSheet(auth, id, range, values, callback){
  var options = {
    access_token: auth,
    spreadsheetId: id,
    resource: {
      valueInputOption: 'RAW',
      data: [
        {
          range: range,
          majorDimension: 'ROWS',
          values: [values]
        }
      ]
    }
  }

  sheets.spreadsheets.values.batchUpdate(options, function(err, res){
    callback(err, res);
  })
}

//use api to retrieve sheet data from cells A1 to J500 - arbitrary numbers, should be good enough
function getSheet(auth, id, callback) {
  sheets.spreadsheets.values.get({
    access_token: auth,
    spreadsheetId: id,
    range: 'Sheet1!A1:J500'
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      callback(err,null);
    }
    callback(null,response);
  });
}

module.exports = router;
