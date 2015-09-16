var Config = require('./config');
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
    var longitude, latitude, nCode, mCode;
    var apiKey = Config.googleKey;
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
                var n1, n2;
                codes = parsed.result.primaryTopic.occursIn;
                //console.log(codes);
                codes.forEach(function(item){
                    if(item.level === 3){
                        nCode = item.code;
                    }else{
                        if(item.level === 2){
                            n2 = item.code;
                        }else {
                            if(item.level === 1){
                                n1 = item.code;
                            }
                        }
                    }
                });
                //---find mcp id
                var apiURI2 = 'http://api.risis.ops.few.vu.nl/PointToMunicipality.json?long='+longitude+'&lat='+latitude;
                rp.get({uri: apiURI2}).then(function(body3){
                    var parsed = JSON.parse(body3);
                    if(parsed && parsed.result){
                        mCode = parsed.result.primaryTopic.occursIn.municipalityID;
                    }
                    res.render('addressToMunicipality', {input: req.body.addr, address: encodeURIComponent(req.body.addr), point:{long: longitude, lat: latitude}, mCode: mCode ? mCode : '', nCode: nCode ? nCode : (n2 ? n2 : (n1 ? n1 : ''))});
                }).catch(function (err) {
                    console.log(err);
                    res.send('');
                    return 0;
                });
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
    var apiKey = Config.googleKey;
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
    var apiURI = 'http://api.risis.ops.few.vu.nl/NUTStoMunicipality/' + req.params.code + '.json?_pageSize=all';
    rp.get({uri: apiURI}).then(function(body){
        var parsed = JSON.parse(body);
        var output = '<!DOCTYPE html><html><head><link href="https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.1.3/semantic.min.css" rel="stylesheet" type="text/css" /><title>NUTStoMunicipality</title></head><body><div class="ui segments"><div class="ui segment"><h3><a target="_blank" href="/NUTStoMunicipality/'+req.params.code+'">NUTS to Municipality</a> <span class="ui label">'+req.params.code+'</span></h3></div><div class="ui segment"><table class="ui unstackable table"><thead><tr><th>Name (<small>FUA</small>)</th><th>Code (<small>FUA</small>)</th> <th class="right aligned">is Core ?</th></tr></thead><tbody>';
        parsed.result.items.forEach(function(el){
            output = output + '<tr><td>'+el.title+' (<small><a href="https://en.wikipedia.org/wiki/'+encodeURIComponent(el.functionalUrbanArea.title)+'" target="_blank">'+el.functionalUrbanArea.title+'</a></small>)</td><td>'+el.municipalityID+' (<small><a href="https://en.wikipedia.org/wiki/'+encodeURIComponent(el.functionalUrbanArea.title)+'" target="_blank">'+el.functionalUrbanArea.code+'</a></small>)</td><td class="right aligned">'+(parseInt(el.isCore) ? '<i class="ui big green checkmark icon"></i>' : '')+'</td></tr>';
        });
        output = output + '  </tbody></table></div></div></body></html>';
        res.send(output);
    }).catch(function (err) {
        console.log(err);
        res.send('');
        return 0;
    });
});
app.get('/MunicipalityToFUA/:code?', function(req, res) {
    if(!req.params.code){
        res.send('Please enter the Municipality code! /MunicipalityToFUA/{code}');
        return 0;
    }
    var apiURI = 'http://api.risis.ops.few.vu.nl/MunicipalityToPolygon/' + req.params.code + '.json';
    rp.get({uri: apiURI}).then(function(body){
        var parsed = JSON.parse(body);
        var output = '<!DOCTYPE html><html><head><link href="https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.1.3/semantic.min.css" rel="stylesheet" type="text/css" /><title>NUTStoMunicipality</title></head><body><div class="ui segments"><div class="ui segment"><h3><a target="_blank" href="/MunicipalityToFUA/'+req.params.code+'">Municipality to FUA</a> <span class="ui label">'+req.params.code+'</span></h3></div><div class="ui segment"><table class="ui unstackable table"><thead><tr><th>Name (<small>FUA</small>)</th><th>Code (<small>FUA</small>)</th> <th class="right aligned">is Core ?</th></tr></thead><tbody>';
        output = output + '<tr><td>'+parsed.result.primaryTopic.label+' (<small><a href="https://en.wikipedia.org/wiki/'+encodeURIComponent(parsed.result.primaryTopic.label)+'" target="_blank">'+parsed.result.primaryTopic.functionalUrbanArea.title+'</a></small>)</td><td>'+req.params.code+' (<small><a href="https://en.wikipedia.org/wiki/'+encodeURIComponent(parsed.result.primaryTopic.functionalUrbanArea.title)+'" target="_blank">'+parsed.result.primaryTopic.functionalUrbanArea.fuaID+'</a></small>)</td><td class="right aligned">'+(parseInt(parsed.result.primaryTopic.isCore) ? '<i class="ui big green checkmark icon"></i>' : '')+'</td></tr>';
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
app.get('/Municipality/:code?/:width?/:height?/:color?', function(req, res) {
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
    var apiURI = 'http://api.risis.ops.few.vu.nl/MunicipalityToPolygon/' + req.params.code + '.json';
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
        var finalScript = '<!DOCTYPE html><html><head><title>Municipality: '+req.params.code+'</title><script src="http://maps.googleapis.com/maps/api/js"></script><script> '+ output + ' function initialize(){var mapProp = {center: arr[0],zoom:10,mapTypeId: google.maps.MapTypeId.ROADMAP};' + ' var map=new google.maps.Map(document.getElementById("googleMap"),mapProp);' + ' var regionPath=new google.maps.Polygon({path: arr,strokeColor:"'+color+'",strokeOpacity:0.8,strokeWeight:2,fillColor:"'+color+'",fillOpacity:0.4});' + ' regionPath.setMap(map);}' + ' google.maps.event.addDomListener(window, "load", initialize); '+ '</script></head><body><div id="googleMap" style="width:'+width+'px;height:'+height+'px;"></div></body></html>';
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
        var nutsLinks = [];
        codes.forEach(function(item){
            nutsLinks.push('<a target="_blank" class="ui label" href="/NUTS/'+item.code+'"">'+item.code+'</a>');
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
                      var opacity = i * 0.10 + 0.14;
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
                finalScript = finalScript + ' google.maps.event.addDomListener(window, "load", initialize); '+ '</script></head><body><div class="ui segments"><div class="ui segment"><h3><a target="_blank" href="/PointToNUTS/'+pointLong+'/'+pointLat+'">Coordinates to NUTS</a></h3></div><div class="ui segment">'+nutsLinks.join(' ')+'<div id="googleMap" style="width:'+width+'px;height:'+height+'px;"></div></div></div></body></html>';
                res.send(finalScript);
            }
        });
    }).catch(function (err) {
        console.log(err);
        res.send('');
        return 0;
    });

});
app.get('/PointToMunicipality/:long?/:lat?/:width?/:height?/:sep?', function(req, res) {
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
    var apiURI = 'http://api.risis.ops.few.vu.nl/PointToMunicipality.json?long='+pointLong+'&lat='+pointLat;
    var codes;
    var colors = ['#0bc4a7', '#1a48eb', '#ecdc0b', '#ed1ec6', '#d9990b', '#0c0d17', '#e3104f', '#6d8ecf'];
    rp.get({uri: apiURI}).then(function(body){
        var parsed = JSON.parse(body);
        //list of regions
        codes = parsed.result.primaryTopic.occursIn;
        if(!Array.isArray(codes)){
            codes = [codes];
        }
        var asyncTasks = [];
        var polygons = [];
        var nutsLinks = [];
        codes.forEach(function(item){
            nutsLinks.push('<a target="_blank" class="ui label" href="/Municipality/'+item.municipalityID+'"">'+item.municipalityID+'</a>');
          // We don't actually execute the async action here
          // We add a function containing it to an array of "tasks"
          asyncTasks.push(function(callback){
              rp.get({uri: 'http://api.risis.ops.few.vu.nl/MunicipalityToPolygon/' + item.municipalityID + '.json'}).then(function(body2){
                  var parsed2 = JSON.parse(body2);
                  var input = parsed2.result.primaryTopic.geometry;
                  if(Array.isArray(input)){
                      input = parsed2.result.primaryTopic.geometry[0];
                  }
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
                var finalScript = '<!DOCTYPE html><html><head><title>PointToMunicipality: ('+pointLat+','+pointLong+')</title></head><body>';
                codes.forEach(function(item, i){
                    finalScript = finalScript + '<iframe src="http://lda-apps.risis.ops.few.vu.nl/Municipality/'+item.municipalityID+'/400/400/'+colors[i].split('#')[1]+'" width="400" height="400" style="border:none"></iframe> ';
                });
                finalScript = finalScript + '</body></html>';
                res.send(finalScript);
            }else{
                var finalScript = '<!DOCTYPE html><html><head><link href="https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.1.3/semantic.min.css" rel="stylesheet" type="text/css" /><title>PointToMunicipality: ('+pointLat+','+pointLong+')</title><script src="http://maps.googleapis.com/maps/api/js"></script><script> ' + ' var myPoint=new google.maps.LatLng('+pointLat+','+pointLong+'); var marker; ';
                polygons.forEach(function(input, i){
                    var points = parseVirtPolygon(input);
                    var output = 'var arr'+i+' = [];';
                    points.forEach(function(el){
                        var tmp = el.split(' ');
                        output = output + 'arr'+i+'.push(new google.maps.LatLng('+tmp[1]+','+tmp[0]+')); ';
                    })
                      finalScript = finalScript + output;
                      if(i === 0){
                          finalScript = finalScript + ' function initialize(){var mapProp = {center: arr'+i+'[0],zoom:10,mapTypeId: google.maps.MapTypeId.ROADMAP};' +' var map=new google.maps.Map(document.getElementById("googleMap"),mapProp); ';
                      }
                      var opacity = i * 0.10 + 0.14;
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
                finalScript = finalScript + ' google.maps.event.addDomListener(window, "load", initialize); '+ '</script></head><body><div class="ui segments"><div class="ui segment"><h3><a target="_blank" href="/PointToMunicipality/'+pointLong+'/'+pointLat+'">Coordinates to Municipality</a></h3></div><div class="ui segment">'+nutsLinks.join(' ')+'<div id="googleMap" style="width:'+width+'px;height:'+height+'px;"></div></div></div></body></html>';
                res.send(finalScript);
            }
        });
    }).catch(function (err) {
        console.log(err);
        res.send('');
        return 0;
    });
});
function get_random_color() {var letters = "ABCDE".split("");var color = "#";for (var i=0; i<3; i++ ) {color += letters[Math.floor(Math.random() * letters.length)];}return color;}

app.get('/Municipalities/:country/:width?/:height?/:sep?/:size?', function(req, res) {
    if(!req.params.country){
        res.send('');
        return 0;
    }
    var sep = 0;
    var pageSize = 'all';
    if(req.params.size){
        pageSize = req.params.size;
    }
    if(req.params.sep){
        sep = req.params.sep;
    }
    var width = 500;
    var height = 500;
    if(req.params.width){
        width = req.params.width;
    }
    if(req.params.height){
        height = req.params.height;
    }
    var apiURI = 'http://api.risis.ops.few.vu.nl/MunicipalitiesPerCountry/'+req.params.country+'.json?_pageSize='+pageSize;
    var codes;
    var colors = ['#0bc4a7', '#1a48eb', '#ecdc0b', '#ed1ec6', '#d9990b', '#0c0d17', '#e3104f', '#6d8ecf', '#0bc4a7'];
    rp.get({uri: apiURI}).then(function(body){
        var parsed = JSON.parse(body);
        //list of regions
        codes = parsed.result.items;
        if(!Array.isArray(codes)){
            codes = [codes];
        }
        var asyncTasks = [];
        var polygons = [];
        var nutsLinks = [];
        codes.forEach(function(item){
            nutsLinks.push('<a target="_blank" class="ui label" href="/Municipality/'+item.municipalityID+'"">'+item.municipalityID+'</a>');
          // We don't actually execute the async action here
          // We add a function containing it to an array of "tasks"
          asyncTasks.push(function(callback){
              //console.log('http://api.risis.ops.few.vu.nl/MunicipalityToPolygon/' + item.municipalityID + '.json');
              rp.get({uri: 'http://api.risis.ops.few.vu.nl/MunicipalityToPolygon/' + item.municipalityID + '.json'}).then(function(body2){
                  var parsed2 = JSON.parse(body2);
                  //console.log(parsed2.result.primaryTopic.label);
                  var input = parsed2.result.primaryTopic.geometry;
                  if(Array.isArray(input)){
                      input = parsed2.result.primaryTopic.geometry[0];
                  }
                  polygons.push({geometry: input, id: item.municipalityID, name: item.title, isCore: parsed2.result.primaryTopic.isCore, fua: parsed2.result.primaryTopic.functionalUrbanArea});
                  callback();
              }).catch(function (err) {
                  console.log('atomic: ', err);
                  callback();
              });
          });
        });
        async.parallelLimit(asyncTasks, 20, function(){
            // All tasks are done now
            if(sep && sep !== '0'){
                //render in different iframes
                var finalScript = '<!DOCTYPE html><html><head><title>Municipalities: ('+req.params.country+')</title><link href="https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.1.3/semantic.min.css" rel="stylesheet" type="text/css" /></head><body><div class="ui cards">';
                codes.forEach(function(item, i){
                    finalScript = finalScript + '<div class="ui card"><a href="/Municipality/'+item.municipalityID+'" target="_blank"><span class="top left attached ribbon ui blue label">'+item.municipalityID+': '+item.title+'</span></a><iframe src="http://lda-apps.risis.ops.few.vu.nl/Municipality/'+item.municipalityID+'/400/400/'+'" width="400" height="400" style="border:none"></iframe> </div>';
                });
                finalScript = finalScript + '</div></body></html>';
                res.send(finalScript);
            }else{
                var finalScript = '<!DOCTYPE html><html><head><link href="https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.1.3/semantic.min.css" rel="stylesheet" type="text/css" /><link rel="stylesheet" href="http://cdn.leafletjs.com/leaflet-0.7.5/leaflet.css" /><style>		.info {padding: 6px 8px;font: 14px/16px Arial, Helvetica, sans-serif;background: white;background: rgba(255,255,255,0.8);box-shadow: 0 0 15px rgba(0,0,0,0.2);border-radius: 5px;}.info h4 {margin: 0 0 5px;color: #777;}</style><title>PointToMunicipality: ('+req.params.country+')</title> ';
                var features = [];
                var colorsObject = {};
                polygons.forEach(function(input, i){
                    //console.log(input.name, input.id);
                    var points = parseVirtPolygon(input.geometry);
                    //console.log(input.name, input.id);
                    var coordinatesArr = [];
                    points.forEach(function(el){
                        var tmp = el.split(' ');
                        coordinatesArr.push([parseFloat(tmp[0]), parseFloat(tmp[1])])
                    })
                    features.push({"type": "Feature", "id": input.id, "properties": {"name": input.name, "isCore": input.isCore, "fua": input.fua}, "geometry": {"type": "Polygon", coordinates: [coordinatesArr]}});
                    colorsObject[input.id] = get_random_color();
                      if(i === 0){

                      }
                      if(i === (polygons.length - 1 )){

                      }
                });
                var focusPoint = features[0].geometry.coordinates[0][0];
                var mapboxAccessToken = Config.mapboxKey;
                var mcpData = {"type":"FeatureCollection","features": features};
                finalScript = finalScript +  '</head><body><div class="ui segments"><div class="ui segment"><h3><a target="_blank" href="/Municipalities/'+req.params.country+'">Municipalities</a></h3></div><div class="ui segment"><div id="map" style="width:'+width+'px;height:'+height+'px;"></div>'+nutsLinks.join(' ')+'</div></div><script src="http://cdn.leafletjs.com/leaflet-0.7.5/leaflet.js"></script><script> var colorObject = '+JSON.stringify(colorsObject)+'; function getColor(d) { return colorObject[d];}	function style(feature) {return {weight: 2,opacity: 1,color: (parseInt(feature.properties.isCore) ? (feature.properties.name === feature.properties.fua.title ? "black" : "grey") : "white"),dashArray: "3",fillOpacity: 0.8,fillColor: getColor(feature.id)};} var map = L.map("map").setView([ '+focusPoint[1]+', '+focusPoint[0]+'], 7); var info = L.control();info.onAdd = function (map) {this._div = L.DomUtil.create("div", "info");this.update();return this._div;};info.update = function (props) {this._div.innerHTML = "<h4>Municipality: </h4>" +  (props ? ("<b>" + props.name + "</b><br/> is Core? <b>" + (props.isCore ? "yes" : "no")) + "</b><br/> FUA: " + props.fua.title : "Hover over a state");}; info.addTo(map);function highlightFeature(e) {var layer = e.target;layer.setStyle({weight: 5,color: "#666",dashArray: "",fillOpacity: 0.7}); if (!L.Browser.ie && !L.Browser.opera) { layer.bringToFront(); } info.update(layer.feature.properties); } function resetHighlight(e) { geojson.resetStyle(e.target); info.update();} function zoomToFeature(e) {map.fitBounds(e.target.getBounds());} function onEachFeature(feature, layer) {layer.on({mouseover: highlightFeature,mouseout: resetHighlight,click: zoomToFeature});}  L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}", {attribution: \'Map data &copy; <a href=\"http://openstreetmap.org\">OpenStreetMap</a> contributors, <a href=\"http://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>, Imagery © <a href=\"http://mapbox.com\">Mapbox</a>\',maxZoom: 18,id: "mapbox.light",accessToken: "'+mapboxAccessToken+'"}).addTo(map); var geojson = L.geoJson('+JSON.stringify(mcpData)+', {style: style, onEachFeature: onEachFeature}).addTo(map);</script></body></html>';
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
