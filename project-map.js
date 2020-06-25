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
                   var popUps = document.getElementsByClassName('popup-container');
                   var toolTip = document.getElementsByClassName('hover-container');

                   var zoom = map.getZoom();
                   if (zoom > 15) {
                       map.easeTo({
                           pitch: 60,
                           bearing: -20,
                           offset: [0, 500],
                       });
                   } else if (zoom > 10) {
                       map.easeTo({
                           pitch: 20,
                           bearing: 0,
                           offset: [0, 0],
                       })
                       if (popUps[0]) popUps[0].remove();
                       if (toolTip[0]) toolTip[0].remove();
                   } else {
                       map.easeTo({
                           pitch: 0,
                           bearing: 0,
                           offset: [0, 0],
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
                                       clusterMaxZoom: 12, // Max zoom to cluster points on
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
                                           'clusterMaxZoom': 12,
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
                                           'circle-radius': 7,
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
                                       var vidLink = e.features[0].properties.video
                                       var description = (vidLink !== "") ? vidLink : '<div class="tan-pop"   ><h3>' + project + '</h3>' + '<img src="' + image + '" /><br><p>' + blurb + '</p></div>'

                                       // Ensure that if the map is zoomed out such that multiple
                                       // copies of the feature are visible, the popup appears
                                       // over the copy being pointed to.
                                       while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                                           coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
                                       }

                                       //add Popup to map
                                       new mapboxgl.Popup({
                                               className: 'popup-container'
                                           })
                                           .setLngLat(coordinates)
                                           .setHTML(description)
                                           .addTo(map)
                                           .setMaxWidth("600px");
                                       map.flyTo({
                                           center: coordinates,
                                           zoom: 16,
                                       });
                                       new mapboxgl.Popup({
                                               className: 'hover-container'
                                           })
                                           .setLngLat(coordinates)
                                           .setHTML(project)
                                           .addTo(map)
                                   });

                                   // Create a popup, but don't add it to the map yet.
                                   var hovertip = new mapboxgl.Popup({
                                       className: 'hover-container',
                                       closeButton: false,
                                       closeOnClick: false
                                   });

                                   map.on('mouseenter', 'cluster-point', function (e) {
                                       // Change the cursor style as a UI indicator.
                                       map.getCanvas().style.cursor = 'pointer';

                                       var coordinates = e.features[0].geometry.coordinates.slice();
                                       var project = e.features[0].properties.project;

                                       // Ensure that if the map is zoomed out such that multiple
                                       // copies of the feature are visible, the popup appears
                                       // over the copy being pointed to.
                                       while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                                           coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
                                       }

                                       // Populate the popup and set its coordinates
                                       // based on the feature found.
                                       hovertip
                                           .setLngLat(coordinates)
                                           .setHTML(project)
                                           .addTo(map);
                                   });

                                   map.on('mouseleave', 'cluster-point', function () {
                                       map.getCanvas().style.cursor = '';
                                       hovertip.remove();
                                   });

                                   // zoom fit
                                   document.getElementById('icon-button').addEventListener('click', function () {
                                       var bounds = new mapboxgl.LngLatBounds();
                                       var popUps = document.getElementsByClassName('popup-container');

                                       data.features.forEach(function (feature) {
                                           bounds.extend(feature.geometry.coordinates);
                                       });
                                       if (popUps[0]) popUps[0].remove();

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
                                   map.on('click', 'cluster', function (e) {
                                       const cluster = map.queryRenderedFeatures(e.point, {
                                           layers: ["cluster"]
                                       });

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

                                       e.features.forEach(function (feature) {
                                           bounds.extend(feature.geometry.coordinates);
                                       });

                                       map.fitBounds(bounds, {
                                           padding: 40,
                                           zoom: 12,
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
                                           zoom: 16,
                                       });
                                   }

                                   function createPopUp(currentFeature) {

                                       var project = currentFeature.properties.project
                                       var image = currentFeature.properties.image
                                       var blurb = currentFeature.properties.blurb
                                       var vidLink = currentFeature.properties.video
                                       var description = (vidLink !== "") ? vidLink : '<div class="tan-pop"   ><h3>' + project + '</h3>' + '<img src="' + image + '" /><br><p>' + blurb + '</p></div>'
                                       var popUps = document.getElementsByClassName('popup-container');
                                       /** Check if there is already a popup on the map and if so, remove it */
                                       if (popUps[0]) popUps[0].remove();
                                       new mapboxgl.Popup({
                                               className: 'popup-container',
                                           })
                                           .setLngLat(currentFeature.geometry.coordinates)
                                           .setHTML(description)
                                           .addTo(map)
                                           .setMaxWidth("600px");
                                   }






                               }

                           );

                       });
               };
           });
