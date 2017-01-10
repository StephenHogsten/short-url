var express = require('express');
var path = require('path');
var url = require('url');
var mongoclient = require('mongodb').MongoClient;

var app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.get(/^\/new\/([:\w.\/]*)/, function(req, res) {
  console.log('got to our special place: ' + req.params[0]);
  
  //parse, validate, and test url
  var oldURL = url.parse(req.params[0]);
  var h;
  console.log(oldURL.protocol);
  switch (oldURL.protocol) {
    case 'http:':
      h = require('http');
      break;
    case 'https:':
      h = require('https');
      break;
    default:
      showJSONerror(res);
      return;
  }
  console.log('stored ' + h);
  var options = {
    protocol: oldURL['protocol'],
    hostname: oldURL['hostname'],
    method: 'HEAD'
  };
  var pingreq = h.request(options, function(pingres) {
    console.log('we made a ping: ' + pingres.statusCode);
    if (pingres.statusCode === 200) {
      mongoclient.connect('mongodb://localhost:27017/appdata', function(err, db){
        if (err) throw err;
        console.log('opened connection to mongo');
        
        //add one to the counter
        db.collection('nextNum').update({}, {
          $inc: {counter: 1}
        });
        console.log('incremented db?');
        
        //get the new counter value
        db.collection('nextNum').find({}, {counter:1, _id:0}).toArray( function(err, data){
          if (err) throw err;
          console.log('inside fn promise, current val: ' + data[0].counter);
          //make new URL
          var count = data[0].counter;
          var newURL = 'https://shorten-url-hogdogthegod.c9users.io/' + count;
          var newObj = {
            'original-url': oldURL.href,
            'short-url': newURL
          };
          console.log('created object:');
          console.log(newObj);
          
          //output info
          res.json(newObj);
          console.log('returned json');
          
          //save to DB
          newObj['short-id'] = count;
          db.collection('urls').insert(newObj);
          console.log('saved to db');
          
          //clean up?
          res.end();
          db.close();
          console.log('cleaned up');
        });
      })
    } else {
      showJSONerror(res);
    }
    });
  pingreq.on('error', function() {
    showJSONerror(res)
  });
  pingreq.end();
});

function showJSONerror(res) {
  console.log('caught error');
  res.json({'error': 'no such url'});
  res.end();
}

app.get('/:id', function(req, res){
  console.log('retrieving long url');
  mongoclient.connect('mongodb://localhost:27017/appdata', function(err, db) {
    if (err) throw err;
    
    var prom = db.collection('urls').find({
      'short-id': +req.params.id
    }).toArray();
    prom.then(function(data) {
      if (data.length < 1) {
        res.json({'error':'This url is not in the database'});
      } else {
        res.redirect(data[0]['original-url']);
      }
    
      //clean-up
      res.end();
      db.close();
    })
  })
});

app.get('*', function(req, res){
  showJSONerror(res);
})

app.listen(8080, function() {
  console.log('listener added');
})