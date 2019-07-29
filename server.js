const express = require('express');
const path = require('path');
const app = express();

//app.use('/src', express.static(path.join('/id-420',path.resolve('../../src'))));
//app.use(express.static("src"));
app.use('/',express.static(__dirname));
app.use(express.static(path.join(__dirname + '/src')));
app.use(express.static('src'));

app.get('/', function (req, res) {
  res.send("__dirname: " + __dirname);
});

app.get('/id-420', function (req, res) {
  console.log("__dirname");
  console.log(__dirname);
  res.sendFile(path.join(__dirname + '/index.html'));
  //  res.sendFile(path.join(__dirname + 'index.html'));
  //res.sendFile(__dirname + '/../../index.html');
});

app.listen(8080, function () {
  console.log('Example app listening on port 8080!')
});