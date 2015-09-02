var express = require("express");
var app = express();
var rp = require("request-promise");
//Creating Router() object

app.get("/",function(req,res){
  res.json({"message" : "Hello! I am a Geo app! Try this example: /NUTS/NL326"});
});
// respond with "hello world" when a GET request is made to the homepage
app.get('/NUTS/:code?/:width?/:height?', function(req, res) {
    if(!req.params.code){
        res.send('');
        return 0;
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
        //console.log(input);
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
            var output = 'var arr = [];';
            var arr = [];
            tmp3.forEach(function(el){
                tmp2 = el.split(' ');
                output = output + 'arr.push(new google.maps.LatLng('+tmp2[1]+','+tmp2[0]+')); ';
            })
            var finalScript = '<!DOCTYPE html><html><head><script src="http://maps.googleapis.com/maps/api/js"></script><script> '+ output + ' function initialize(){var mapProp = {center: arr[0],zoom:7,mapTypeId: google.maps.MapTypeId.ROADMAP};' + ' var map=new google.maps.Map(document.getElementById("googleMap"),mapProp);' + ' var regionPath=new google.maps.Polygon({path: arr,strokeColor:"#0000FF",strokeOpacity:0.8,strokeWeight:2,fillColor:"#0000FF",fillOpacity:0.4});' + ' regionPath.setMap(map);}' + ' google.maps.event.addDomListener(window, "load", initialize); '+ '</script></head><body><div id="googleMap" style="width:'+width+'px;height:'+height+'px;"></div></body></html>';
            res.send(finalScript);
        }else{
            res.send('');
            return 0;
        }
    }).catch(function (err) {
        console.log(err);
        res.send('');
        return 0;
    });

});
app.listen(5432,function(){
  console.log("Live at Port 5432");
});
