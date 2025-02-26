// Import Mapbox as an ESM module
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';

// Check that Mapbox GL JS is loaded
console.log("Mapbox GL JS Loaded:", mapboxgl);

mapboxgl.accessToken = 'pk.eyJ1IjoiYmVybGVuemhhbmciLCJhIjoiY203bDY4cGNtMDAwaTJscHJvOTFrdzN4diJ9.vweHOiFI8CYcKanIOl0D7A';

const map = new mapboxgl.Map({
    container: 'map', // ID of the div where the map will render
    style: 'mapbox://styles/mapbox/streets-v12', // Map style
    center: [-71.09415, 42.36027], // [longitude, latitude]
    zoom: 12, // Initial zoom level
    minZoom: 5, // Minimum allowed zoom
    maxZoom: 18 // Maximum allowed zoom
   });

map.on('load', async () => { 
    map.addSource('boston_route', {
        type: 'geojson',
        data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson'
      });

    map.addLayer({
        id: 'bike-lanes',
        type: 'line',
        source: 'boston_route',
        paint: {
            'line-color': '#32D400',  // A bright green using hex code
            'line-width': 5,          // Thicker lines
            'line-opacity': 0.6       // Slightly less transparent
          }
        });

    try {
        const jsonurl = "https://dsc106.com/labs/lab07/data/bluebikes-stations.json";
        const jsonData = await d3.json(jsonurl);
        let stations = jsonData.data.stations;

        const csvUrl = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv';
        const trips = await d3.csv(csvUrl, (trip) => {
            trip.started_at = new Date(trip.started_at);
            trip.ended_at = new Date(trip.ended_at);
            return trip;
        });

        console.log('Loaded JSON Data:', jsonData); // Log to verify structure
        console.log('Stations Array:', stations);
        console.log('Loaded CSV Trips:', trips);

        const departures = d3.rollup(
            trips,
            (v) => v.length,
            (d) => d.start_station_id
        );

        const arrivals = d3.rollup(
            trips,
            (v) => v.length,
            (d) => d.end_station_id
        );

        stations = stations.map((station) => {
            let id = station.short_name;
            station.arrivals = arrivals.get(id) ?? 0;
            station.departures = departures.get(id) ?? 0;
            station.totalTraffic = station.arrivals + station.departures;
            return station;
        });

        console.log('Updated Stations with Traffic Data:', stations);

        const svg = d3.select('#map').select('svg');

        const radiusScale = d3
            .scaleSqrt()
            .domain([0, d3.max(stations, d => d.totalTraffic)])
            .range([0, 25]);

        const circles = svg.selectAll('circle')
            .data(stations)
            .enter()
            .append('circle')
            .attr('r', d => radiusScale(d.totalTraffic))
            .attr('fill', 'steelblue')
            .attr('fill-opacity', 0.6)
            .attr('stroke', 'white')
            .attr('stroke-width', 1)
            .attr('opacity', 0.8); 
        
        function updatePositions() {
            circles
                .attr('cx', d => getCoords(d).cx)
                .attr('cy', d => getCoords(d).cy);
            }
        
        updatePositions();
    } catch (error) {
        console.error('Error loading JSON:', error); 
    } 
});

map.on('move', updatePositions);
map.on('zoom', updatePositions);
map.on('resize', updatePositions);
map.on('moveend', updatePositions);

function getCoords(station) {
    const point = new mapboxgl.LngLat(+station.lon, +station.lat);
    const { x, y } = map.project(point);
    return { cx: x, cy: y };
}
