var express = require('express');
var path = require('path');

var app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.get('/new/:url', function(req, res) {
  res.write('you\'ve reached the special area!');
  res.end();
});

app.get('/:id', function(req, res){
  res.end('this area is not so special');
});

app.listen(8080, function() {
  console.log('listener added');
})