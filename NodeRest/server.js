/*var http = require('http');
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello New York\n');
}).listen(3001);
console.log('Server running at http://localhost:3001/');
*/


var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cors = require('cors');
var parseJson = require('parse-json');
const fs = require('fs');

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(cors());

app.get('/', function(req, res) {
  res.send('Hello Seattle\n');
});

app.post('/boundingBox', function(req, res) {

   // Get /musician/Matt
   //console.log(req.params.name)
	console.log(req.body);
   // => Matt

   res.send('OKayyyy');
});


app.post('/getRawImage', function(req, res) {

   // Get /musician/Matt
   //console.log(req.params.name)
	console.log(JSON.stringify(req.body));
	var json = JSON.stringify(req.body);
	parsedJson = parseJson(json);

	feature = parsedJson.featureName;
	camID = parsedJson.camId
	feature = "feature "+feature+"\n"+"camid "+camID;
	console.log(feature);
	
	fs.writeFileSync('/media/ubuntu/5dba3336-3902-4e14-97db-88ce1da50ce4/dummy/jetson-device-client/jetson-inference/build/aarch64/bin/feature-config', feature, (err) => {  
    // throws an error, you could also catch it here
    if (err) throw err;

    // success case, the file was saved
    console.log('Feature saved!');
});

   res.send('OKayyyy');
});


app.listen(3001);
console.log('Listening on port 3001...');

