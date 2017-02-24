var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  console.log('authenticated: ' + req.isAuthenticated());
  res.render('index', { title: 'Timesheet', authenticated: req.isAuthenticated()});
});

module.exports = router;
