var express = require('express');
var google = require('googleapis');
var router = express.Router();

var dateIndex,lastEntry;

//get all cells in spreadsheet
router.get('/spreadsheet', function(req, res){
  var params = req.query;

  var sheetId = params['sheet_id'];
  var accessToken = params['access_token'];
  testSheet(accessToken, sheetId, function(err, resp){
    if(err){
      res.redirect('/#error');
    }else{
      res.json(resp);
    }
  });
});

//create new entry in spreadsheet
router.post('/spreadsheet', function(req, res){
  var params = req.query;

  var desc = params['desc'];
  var hours = params['hours'];
  var date = new Date().toLocaleDateString();

  //TODO Write entry to GoogleSheets and shift footer down

});

//read cells in the sheet to update index variables for reference
function updateIndices(data){
  data.forEach(function(row){

  });
}

//use api to retrieve sheet data from cells A1 to J500 - arbitrary numbers, hopefully it'll work
function getSheet(auth, id, callback) {
  var sheets = google.sheets('v4');
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
