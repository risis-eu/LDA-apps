# LDA-apps
A set of applications which exploit RISIS Linked Data API
# List of Geo apps
- converts address to location: http://lda-apps.risis.ops.few.vu.nl/geocode
- shows a NUTS region on the map: `/NUTS/{code}` e.g. http://lda-apps.risis.ops.few.vu.nl/NUTS/NL326
- shows a point together with its containing NUTS region on the map: `/PointToNUTS/{longitude}/{latitude}` e.g.  http://lda-apps.risis.ops.few.vu.nl/PointToNUTS/4.8650/52.3339 or http://lda-apps.risis.ops.few.vu.nl/PointToNUTS/4.8650/52.3339/1000/1000 to enlarge the map size or http://lda-apps.risis.ops.few.vu.nl/PointToNUTS/4.8650/52.3339/1000/1000/1 to show the detected regions on separate maps
- shows a point and NUTS region on the map: `/PointAndNUTS/{longitude}/{latitude}/{code}` e.g.  http://lda-apps.risis.ops.few.vu.nl/PointAndNUTS/4.8650/52.3339/NL324
