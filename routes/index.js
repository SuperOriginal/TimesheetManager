var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Timesheet', authenticated: req.isAuthenticated()});
});

module.exports = router;
