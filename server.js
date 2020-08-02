var fs = require("fs");
var express = require('express');
var app = express();
var http = require("http").Server(app);
const bodyParser = require('body-parser');

app.use(express.static(__dirname + "/static"));
app.use(bodyParser.json());

var jsonRes=null;

app.get('/', function (req, res) {
    res.sendFile( __dirname + "/static/index.html" );
 })

app.post("/upload", function(req, res){
    jsonRes = JSON.stringify(req.body);
});

app.get("/download", function(req, res){
    fs.writeFileSync("files/res.json", jsonRes, function(err){
        if (err) console.log(err);
    });

    res.download("files/res.json");
    
});


http.listen(80);
