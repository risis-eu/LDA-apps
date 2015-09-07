var express = require("express");
var bodyParser = require("body-parser");
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
var rp = require("request-promise");
var async = require("async");
var path = require('path');
//-----------template engine
var hogan  = require("hogan-express");
app.set('views', path.join(__dirname, '/templates'));
app.set('view engine', 'html');
app.set('view options', { layout: false });
//server.enable('view cache');
app.engine('html', hogan);
//------------------
//Creating Router() object

app.get("/",function(req,res){
  res.json({"message" : "Hello! I am a Geo app! Try this example: /NUTS/NL326"});
});
var parseVirtPolygon = function(input) {
    var tmp = input.split(')');
    var tl = tmp.length;
    if(tl){
        if(tl === 3){
            //normal polygon
            //console.log(tmp);
        }else if (tl === 4){
            //polygon with holes
            //console.log(tmp);
        }
        var tmp2 = tmp[0].split('(');
        var tmp3 = tmp2[2].split(',');
        return tmp3;
    }else{
        return [];
    }
};
app.get('/addressToMunicipality', function(req, res) {
    res.render('addressToMunicipality', {input: ''});
});
app.post('/addressToMunicipality', function(req, res) {
    if((!req.body.addr)){
        res.send('Please add an address in the URI: /geocode/{your address}');
        return 0;
    }
    var longitude, latitude, nCode;
    var apiKey = 'AIzaSyDvHC2-4XJIJcgcwRAWywJJ_alaPYFNQCE';
    var apiURI = 'https://maps.googleapis.com/maps/api/geocode/json?address='+encodeURIComponent(decodeURIComponent(req.body.addr))+'&key=' + apiKey;
    rp.get({uri: apiURI}).then(function(body){
        var parsed = JSON.parse(body);
        //res.json(parsed);
        if(parsed.results.length){
            //var formatted = parsed.results[0].formatted_address;
            var location = parsed.results[0].geometry.location;
            latitude = location.lat;
            longitude = location.lng;
            var apiURI = 'http://api.risis.ops.few.vu.nl/PointToNUTS.json?long='+longitude+'&lat='+latitude;
            var codes;
            rp.get({uri: apiURI}).then(function(body2){
                var parsed = JSON.parse(body2);
                //list of regions
                codes = parsed.result.primaryTopic.occursIn;
                codes.forEach(function(item){
                    if(item.level === 3){
                        nCode = item.code;
                    }
                });
                res.render('addressToMunicipality', {input: req.body.addr, address: encodeURIComponent(req.body.addr), point:{long: longitude, lat: latitude}, nCode: nCode});
            }).catch(function (err) {
                console.log(err);
                res.send('');
                return 0;
            });
        }else{
            res.send('No result!');
        }
    }).catch(function (err) {
        console.log(err);
        res.send('');
        return 0;
    });
});
app.get('/geocode/:addr?', function(req, res) {
    if((!req.params.addr)){
        res.send('Please add an address in the URI: /geocode/{your address}');
        return 0;
    }
    var apiKey = 'AIzaSyDvHC2-4XJIJcgcwRAWywJJ_alaPYFNQCE';
    var apiURI = 'https://maps.googleapis.com/maps/api/geocode/json?address='+encodeURIComponent(decodeURIComponent(req.params.addr))+'&key=' + apiKey;
    rp.get({uri: apiURI}).then(function(body){
        var parsed = JSON.parse(body);
        //res.json(parsed);
        if(parsed.results.length){
            var formatted = parsed.results[0].formatted_address;
            var location = parsed.results[0].geometry.location;
                res.send('<!DOCTYPE html><html><head><meta charset="utf-8"><link href="https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.1.3/semantic.min.css" rel="stylesheet" type="text/css" /><title>geocode</title></head><body><div class="ui page grid"> <div class="row"> <div class="ui segments column"><div class="ui orange segment"><h3><a target="_blank" href="/geocode/'+encodeURIComponent(req.params.addr)+'">Address to Coordinates</a></h3> </div> <div class="ui segment"> <div class="content"> <div class="description"> <form method="post" class="ui form fields"><div class="field success"> <label>Fomatted Address</label> <div class="ui icon input"> <textarea rows="4">'+formatted+'</textarea> </div> </div> <div class="field success"> <label>Latitude</label> <div class="ui icon input"> <input type="text" value="'+location.lat+'" /> </div> </div> <div class="field success"> <label>Longitude</label> <div class="ui icon input"> <input type="text" value="'+location.lng+'" /> </div> </div> <div class="field"> </div></form></div> </div> </div> </div> </div></div> <div style="display:none">'+JSON.stringify(parsed)+'</div></body></html>');
        }else{
            res.send('No result!');
        }
    }).catch(function (err) {
        console.log(err);
        res.send('');
        return 0;
    });
});
app.get('/NUTStoMunicipality/:code?', function(req, res) {
    if(!req.params.code){
        res.send('Please enter the NUTS code! /NUTStoMunicipality/{code}');
        return 0;
    }
    var apiURI = 'http://api.risis.ops.few.vu.nl/NUTStoMunicipality/' + req.params.code + '.json';
    rp.get({uri: apiURI}).then(function(body){
        var parsed = JSON.parse(body);
        var output = '<!DOCTYPE html><html><head><link href="https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.1.3/semantic.min.css" rel="stylesheet" type="text/css" /><title>NUTStoMunicipality</title></head><body><div class="ui segments"><div class="ui segment"><h3><a target="_blank" href="/NUTStoMunicipality/'+req.params.code+'">NUTS to Municipality</a></h3></div><div class="ui segment"><table class="ui unstackable table"><thead><tr><th>Name</th><th>Code</th> <th class="right aligned">is Core ?</th></tr></thead><tbody>';
        parsed.result.items.forEach(function(el){
            output = output + '<tr><td>'+el.title+'</td><td>'+el.municipalityID+'</td><td class="right aligned">'+(parseInt(el.isCore) ? '<i class="ui big green checkmark icon"></i>' : '')+'</td></tr>';
        });
        output = output + '  </tbody></table></div></div></body></html>';
        res.send(output);
    }).catch(function (err) {
        console.log(err);
        res.send('');
        return 0;
    });
});
app.get('/NUTS/:code?/:width?/:height?/:color?', function(req, res) {
    if(!req.params.code){
        res.send('');
        return 0;
    }
    var color = '#0000FF';
    if(req.params.color){
        color = '#' + req.params.color;
    }
    var width = 500;
    var height = 500;
    if(req.params.width){
        width = req.params.width;
    }
    if(req.params.height){
        height = req.params.height;
    }
    var apiURI = 'http://api.risis.ops.few.vu.nl/NUTStoPolygon/' + req.params.code + '.json';
    rp.get({uri: apiURI}).then(function(body){
        var parsed = JSON.parse(body);
        var input = parsed.result.primaryTopic.geometry;
        var points = parseVirtPolygon(input);
        if(!points.length){
            res.send('');
            return 0;
        }
        var output = 'var arr = [];';
        points.forEach(function(el){
            var tmp = el.split(' ');
            output = output + 'arr.push(new google.maps.LatLng('+tmp[1]+','+tmp[0]+')); ';
        })
        var finalScript = '<!DOCTYPE html><html><head><title>NUTS: '+req.params.code+'</title><script src="http://maps.googleapis.com/maps/api/js"></script><script> '+ output + ' function initialize(){var mapProp = {center: arr[0],zoom:7,mapTypeId: google.maps.MapTypeId.ROADMAP};' + ' var map=new google.maps.Map(document.getElementById("googleMap"),mapProp);' + ' var regionPath=new google.maps.Polygon({path: arr,strokeColor:"'+color+'",strokeOpacity:0.8,strokeWeight:2,fillColor:"'+color+'",fillOpacity:0.4});' + ' regionPath.setMap(map);}' + ' google.maps.event.addDomListener(window, "load", initialize); '+ '</script></head><body><div id="googleMap" style="width:'+width+'px;height:'+height+'px;"></div></body></html>';
        res.send(finalScript);
    }).catch(function (err) {
        console.log(err);
        res.send('');
        return 0;
    });
});
app.get('/PointAndNUTS/:long?/:lat?/:code?/:width?/:height?', function(req, res) {
    if(!req.params.code || !req.params.lat || !req.params.long){
        res.send('');
        return 0;
    }
    var width = 500;
    var height = 500;
    var pointLong = req.params.long;
    var pointLat = req.params.lat;
    if(req.params.width){
        width = req.params.width;
    }
    if(req.params.height){
        height = req.params.height;
    }
    var apiURI = 'http://api.risis.ops.few.vu.nl/NUTStoPolygon/' + req.params.code + '.json';
    rp.get({uri: apiURI}).then(function(body){
        var parsed = JSON.parse(body);
        var input = parsed.result.primaryTopic.geometry;
        var points = parseVirtPolygon(input);
        if(!points.length){
            res.send('');
            return 0;
        }
        var output = 'var arr = [];';
        points.forEach(function(el){
            var tmp = el.split(' ');
            output = output + 'arr.push(new google.maps.LatLng('+tmp[1]+','+tmp[0]+')); ';
        })
        var finalScript = '<!DOCTYPE html><html><head><title>PointAndNUTS: ('+pointLat+','+pointLong+') and  '+req.params.code+'</title><script src="http://maps.googleapis.com/maps/api/js"></script><script> '+ output + 'var myPoint=new google.maps.LatLng('+pointLat+','+pointLong+'); var marker;  function initialize(){var mapProp = {center: arr[0],zoom:7,mapTypeId: google.maps.MapTypeId.ROADMAP};' + ' var map=new google.maps.Map(document.getElementById("googleMap"),mapProp); var marker=new google.maps.Marker({position:myPoint,animation:google.maps.Animation.BOUNCE}); marker.setMap(map); ' + ' var regionPath=new google.maps.Polygon({path: arr,strokeColor:"#0000FF",strokeOpacity:0.8,strokeWeight:2,fillColor:"#0000FF",fillOpacity:0.4});' + ' regionPath.setMap(map);}' + ' google.maps.event.addDomListener(window, "load", initialize); '+ '</script></head><body><div id="googleMap" style="width:'+width+'px;height:'+height+'px;"></div></body></html>';
        res.send(finalScript);
    }).catch(function (err) {
        console.log(err);
        res.send('');
        return 0;
    });
});
app.get('/PointToNUTS/:long?/:lat?/:width?/:height?/:sep?', function(req, res) {
    if(!req.params.lat || !req.params.long){
        res.send('');
        return 0;
    }
    var sep = 0;
    if(req.params.sep){
        sep = 1;
    }
    var width = 500;
    var height = 500;
    var pointLong = req.params.long;
    var pointLat = req.params.lat;
    if(req.params.width){
        width = req.params.width;
    }
    if(req.params.height){
        height = req.params.height;
    }
    var apiURI = 'http://api.risis.ops.few.vu.nl/PointToNUTS.json?long='+pointLong+'&lat='+pointLat;
    var codes;
    var colors = ['#0bc4a7', '#1a48eb', '#ecdc0b', '#ed1ec6', '#d9990b', '#0c0d17', '#e3104f', '#6d8ecf'];
    rp.get({uri: apiURI}).then(function(body){
        var parsed = JSON.parse(body);
        //list of regions
        codes = parsed.result.primaryTopic.occursIn;
        var asyncTasks = [];
        var polygons = [];
        codes.forEach(function(item){
          // We don't actually execute the async action here
          // We add a function containing it to an array of "tasks"
          asyncTasks.push(function(callback){
              rp.get({uri: 'http://api.risis.ops.few.vu.nl/NUTStoPolygon/' + item.code + '.json'}).then(function(body2){
                  var parsed2 = JSON.parse(body2);
                  var input = parsed2.result.primaryTopic.geometry;
                  polygons.push(input);
                  callback();
              }).catch(function (err) {
                  callback();
              });
          });
        });
        async.parallel(asyncTasks, function(){
            // All tasks are done now
            if(sep){
                //render in different iframes
                var finalScript = '<!DOCTYPE html><html><head><title>PointToNUTS: ('+pointLat+','+pointLong+')</title></head><body>';
                codes.forEach(function(item, i){
                    finalScript = finalScript + '<iframe src="http://lda-apps.risis.ops.few.vu.nl/NUTS/'+item.code+'/400/400/'+colors[i].split('#')[1]+'" width="400" height="400" style="border:none"></iframe> ';
                });
                finalScript = finalScript + '</body></html>';
                res.send(finalScript);
            }else{
                var finalScript = '<!DOCTYPE html><html><head><link href="https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.1.3/semantic.min.css" rel="stylesheet" type="text/css" /><title>PointToNUTS: ('+pointLat+','+pointLong+')</title><script src="http://maps.googleapis.com/maps/api/js"></script><script> ' + ' var myPoint=new google.maps.LatLng('+pointLat+','+pointLong+'); var marker; ';
                polygons.forEach(function(input, i){
                    var points = parseVirtPolygon(input);
                    var output = 'var arr'+i+' = [];';
                    points.forEach(function(el){
                        var tmp = el.split(' ');
                        output = output + 'arr'+i+'.push(new google.maps.LatLng('+tmp[1]+','+tmp[0]+')); ';
                    })
                      finalScript = finalScript + output;
                      if(i === 0){
                          finalScript = finalScript + ' function initialize(){var mapProp = {center: arr'+i+'[0],zoom:7,mapTypeId: google.maps.MapTypeId.ROADMAP};' +' var map=new google.maps.Map(document.getElementById("googleMap"),mapProp); ';
                      }
                      var opacity = i * 0.15 + 0.35;
                      if(opacity >= 0.70){
                          opacity = 0.50;
                      }
                      var sopacity = 1 - (i * 0.15);
                      if(sopacity <= 0){
                          sopacity = 0.18;
                      }
                      finalScript = finalScript + ' var regionPath'+i+'=new google.maps.Polygon({path: arr'+i+',strokeColor:"'+(colors[colors.length - i - 1])+'",strokeOpacity:'+sopacity+',strokeWeight:2,fillColor:"'+colors[i]+'",fillOpacity:'+opacity+'});' + ' regionPath'+i+'.setMap(map);';
                      if(i === (polygons.length - 1 )){
                          finalScript = finalScript + ' var marker=new google.maps.Marker({position:myPoint,animation:google.maps.Animation.BOUNCE}); marker.setMap(map); }';
                      }
                })
                finalScript = finalScript + ' google.maps.event.addDomListener(window, "load", initialize); '+ '</script></head><body><div class="ui segments"><div class="ui segment"><h3><a target="_blank" href="/PointToNUTS/'+pointLong+'/'+pointLat+'">Coordinates to NUTS</a></h3></div><div class="ui segment"><div id="googleMap" style="width:'+width+'px;height:'+height+'px;"></div></div></div></body></html>';
                res.send(finalScript);
            }
        });
    }).catch(function (err) {
        console.log(err);
        res.send('');
        return 0;
    });

});
app.listen(5432,function(){
  console.log("Live at Port 5432");
});
