           var transformRequest = (url, resourceType) => {
               var isMapboxRequest =
                   url.slice(8, 22) === "api.mapbox.com" ||
                   url.slice(10, 26) === "tiles.mapbox.com";
               return {
                   url: isMapboxRequest ?
                       url.replace("?", "?pluginName=sheetMapper&") : url
               };
           };
           //YOUR TURN: add your Mapbox token 
           mapboxgl.accessToken = 'pk.eyJ1Ijoic2FyYXRhbmdyYW0iLCJhIjoiY2tiYXZ4d3VpMHMzbTJ0bnZobHppaXM0NiJ9.aHmCdpQ10sM8mWb_XqGgtg'; //Mapbox token 
           var map = new mapboxgl.Map({
               container: 'map', // container id
               style: 'mapbox://styles/saratangram/ckbawrykf02jg1impuqmzyrx6', //stylesheet location
               center: [-95.841182, 39.932830], // starting position
               zoom: 3, // starting zoom
               transformRequest: transformRequest
           });

           $(document).ready(function () {
               $.ajax({
                   type: "GET",
                   //YOUR TURN: Replace with csv export link
                   url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRmRnLmKO1zcjDsjRNWQqUSU6Nas1ujNOV-zCKjMLFSpq-h3nB34wvb6w2-msYBkHDLcI7L5L4-5kD0/pub?output=csv',
                   dataType: "text",
                   success: function (csvData) {
                       makeGeoJSON(csvData);
                   }
               });

               map.on('zoomend', function () {
                   var zoom = map.getZoom();
                   if (zoom > 16) {
                       map.easeTo({
                           pitch: 60
                       });
                   } else if (zoom > 9) {
                       map.easeTo({
                           pitch: 20
                       });
                   } else {
                       map.easeTo({
                           pitch: 0
                       });
                   };
               });

               function makeGeoJSON(csvData) {
                   csv2geojson.csv2geojson(csvData, {
                           latfield: 'latitude',
                           lonfield: 'longitude',
                           delimiter: ','
                       },

                       function (err, data) {

                           map.on('load', function () {
                                   //Add the the layer to the map 
                                   map.addSource('projects', {
                                       type: 'geojson',
                                       // Point to GeoJSON data. This example visualizes all M1.0+ earthquakes
                                       // from 12/22/15 to 1/21/16 as logged by USGS' Earthquake hazards program.
                                       data: data,
                                       cluster: true,
                                       clusterMaxZoom: 10, // Max zoom to cluster points on
                                       clusterRadius: 30 // Radius of each cluster when clustering points (defaults to 50)
                                   });


                                   map.addLayer({
                                       'id': 'cluster',
                                       'type': 'circle',
                                       'source': {
                                           'type': 'geojson',
                                           'data': data,
                                           'cluster': true,
                                           'clusterRadius': 30,
                                           'clusterMaxZoom': 10,
                                       },
                                       filter: ['has', 'point_count'],
                                       paint: {
                                           // Use step expressions (https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-step)
                                           // with three steps to implement three types of circles:
                                           //   * Blue, 20px circles when point count is less than 100
                                           //   * Yellow, 30px circles when point count is between 100 and 750
                                           //   * Pink, 40px circles when point count is greater than or equal to 750
                                           'circle-color': '#a5100e',
                                           'circle-radius': [
                                                'step',
                                                ['get', 'point_count'],
                                                20,
                                                3,
                                                25,
                                                5,
                                                30
                                            ],
                                           'circle-opacity': .65,
                                           'circle-stroke-width': 1,
                                           'circle-stroke-color': '#fff'
                                       }
                                   });
                                   map.addLayer({
                                       id: 'cluster-count',
                                       type: 'symbol',
                                       source: 'projects',
                                       filter: ['has', 'point_count'],
                                       layout: {
                                           'text-field': '{point_count_abbreviated}',
                                           'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                                           'text-size': 12,
                                       },
                                       paint: {
                                           "text-color": "#ffffff"
                                       }
                                   });

                                   map.addLayer({
                                       id: 'cluster-point',
                                       type: 'circle',
                                       source: 'projects',
                                       filter: ['!', ['has', 'point_count']],
                                       paint: {
                                           'circle-color': '#a5100e',
                                           'circle-radius': 4,
                                           'circle-stroke-width': 1,
                                           'circle-stroke-color': '#fff'
                                       }
                                   });

                                  

                                   map.on('click', 'cluster-point', function (e) {
                                       var coordinates = e.features[0].geometry.coordinates.slice();

                                       //set popup text 
                                       //You can adjust the values of the popup to match the headers of your CSV. 
                                       // For example: e.features[0].properties.Name is retrieving information from the field Name in the original CSV.   
                                       var image = e.features[0].properties.image
                                       var project = e.features[0].properties.project
                                       var blurb = e.features[0].properties.blurb
                                       var description = '<div class="tan-pop"   ><h3>' + project + '</h3>' + '<img src="' + image + '" /><br><p>' + blurb + '</p></div>'
                                       // Ensure that if the map is zoomed out such that multiple
                                       // copies of the feature are visible, the popup appears
                                       // over the copy being pointed to.
                                       while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                                           coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
                                       }
                                       map.flyTo({
                                           center: e.features[0].geometry.coordinates,
                                           zoom: 17,
                                           pitch: 60
                                       });
                                       //add Popup to map

                                       new mapboxgl.Popup({
                                               className: 'popup-container'
                                           })
                                           .setLngLat(coordinates)
                                           .setHTML(description)
                                           .addTo(map)
                                           .setMaxWidth("40vw");
                                   });
                               // zoom fit
                                   document.getElementById('icon-button').addEventListener('click', function () {
                                       var bounds = new mapboxgl.LngLatBounds();

                                       data.features.forEach(function (feature) {
                                           bounds.extend(feature.geometry.coordinates);
                                       });

                                       map.fitBounds(bounds, {
                                           padding: 40
                                       });
                                   });
                               map.on('mousemove', 'cluster-count', function (e) {
                                         map.getCanvas().style.cursor = 'pointer';

                               }),
                                   map.on('mouseleave', 'cluster-count', function (e) {
                                         map.getCanvas().style.cursor = '';

                               });
                               //cluster click
                                
   map.on('click', 'cluster', function(e) {
    const cluster = map.queryRenderedFeatures(e.point, { layers: ["cluster"] });

    if (cluster[0]) {
    // features: from the added source that are clustered
    const pointsInCluster = data.features.filter(f => {
        const pointPixels = map.project(f.geometry.coordinates)
      const pixelDistance = Math.sqrt(
        Math.pow(e.point.x - pointPixels.x, 2) + 
        Math.pow(e.point.y - pointPixels.y, 2) 
      );
      return Math.abs(pixelDistance) <= cluster.clusterRadius;
    });
    console.log(cluster, pointsInCluster);
	
  }
 var bounds = new mapboxgl.LngLatBounds();

e.features.forEach(function(feature) {
    bounds.extend(feature.geometry.coordinates);
});

map.fitBounds(bounds, {
                                           padding: 40,
    zoom:12,
                                       }); 
});







                                   data.features.forEach(function (store, i) {
                                       store.properties.id = i;
                                   });

                                   function buildList() {
                                       data.features.forEach(function (store, i) {
                                           var prop = store.properties;
                                           var listings = document.getElementById('tan-menu');
                                           var listing = listings.appendChild(document.createElement('li'));
                                           listing.id = prop.id;
                                           /* Assign the `item` class to each listing for styling. */
                                           listing.className = 'list-group-item';
                                           /* Add the link to the individual listing created above. */
                                           var link = listing.appendChild(document.createElement('a'));
                                           link.href = '#';
                                           link.className = 'menu-project';
                                           link.id = "link-" + prop.id;
                                           link.innerHTML = prop.project;
                                           link.addEventListener('click', function (e) {
                                               for (var i = 0; i < data.features.length; i++) {
                                                   if (this.id === "link-" + data.features[i].properties.id) {
                                                       var clickedListing = data.features[i];
                                                       flyToStore(clickedListing);
                                                       createPopUp(clickedListing);
                                                   }
                                               }
                                               var activeItem = document.getElementsByClassName('active');
                                               if (activeItem[0]) {
                                                   activeItem[0].classList.remove('active');
                                               }
                                               this.parentNode.classList.add('active');
                                           });

                                       });

                                   };

                                   buildList(data);

                                   // When a click event occurs on a feature in the csvData layer, open a popup at the
                                   // location of the feature, with description HTML from its properties.
                                   link.addEventListener('click', function (e) {
                                       var clickedListing = data.features[this.dataPosition];
                                       flyToStore(clickedListing);
                                       createPopUp(clickedListing);

                                       var activeItem = document.getElementsByClassName('active');
                                       if (activeItem[0]) {
                                           activeItem[0].classList.remove('active');
                                       }
                                       this.parentNode.classList.add('active');
                                   });
                                   //trying this
                                   function flyToStore(currentFeature) {
                                       map.flyTo({
                                           center: currentFeature.geometry.coordinates,
                                           zoom: 17,
                                           pitch: 60
                                       });
                                   }

                                   function createPopUp(currentFeature) {

                                       var project = currentFeature.properties.project
                                       var image = currentFeature.properties.image
                                       var blurb = currentFeature.properties.blurb
                                       new mapboxgl.Popup({
                                               className: 'popup-container'
                                           })
                                           .setLngLat(currentFeature.geometry.coordinates)
                                           .setHTML('<div class="tan-pop"   ><h3>' + project + '</h3>' + '<img src="' + image + '" /><br><p>' + blurb + '</p></div>')
                                           .addTo(map)
                                           .setMaxWidth("40vw");
                                   }

                                   // Change the cursor to a pointer when the mouse is over the places layer.
                                   map.on('mouseenter', 'csvData', function () {
                                       map.getCanvas().style.cursor = 'pointer';
                                   });

                                   // Change it back to a pointer when it leaves.
                                   map.on('mouseleave', 'places', function () {
                                       map.getCanvas().style.cursor = '';
                                   });



                               }

                           );

                       });
               };
           });