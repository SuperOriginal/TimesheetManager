var express = require('express');
var google = require('googleapis');
var router = express.Router();
router.get('/test', function(req, res){
  var params = req.query;

  var sheetId = params['sheet_id'];
  var accessToken = params['access_token'];

  res.json(testSheet(accessToken, sheetId));

});

function testSheet(auth, id) {
  var sheets = google.sheets('v4');
  sheets.spreadsheets.values.get({
    access_token: auth,
    spreadsheetId: id,
    range: 'Sheet1'
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return err;
    }
    return response;
  });
}

module.exports = router;
