import type { StyleSpecification } from "maplibre-gl";

/** ESRI World Imagery satellite + boundaries/places labels, globe projection. */
export const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  projection: { type: "globe" },
  sources: {
    imagery: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 18,
      attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
    },
    labels: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 18,
    },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#08090b" } },
    { id: "imagery", type: "raster", source: "imagery" },
    { id: "labels", type: "raster", source: "labels", paint: { "raster-opacity": 0.85 } },
  ],
  sky: {
    "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7, 0],
  },
};

export const SURPRISE_CITIES = [
  { name: "Lisbon", lat: 38.7108, lng: -9.1363 },
  { name: "Reykjavik", lat: 64.1466, lng: -21.9426 },
  { name: "Tokyo", lat: 35.6595, lng: 139.7005 },
  { name: "Marrakech", lat: 31.6258, lng: -7.9891 },
  { name: "Venice", lat: 45.4341, lng: 12.3388 },
  { name: "Cape Town", lat: -33.9068, lng: 18.4207 },
  { name: "Queenstown", lat: -45.0312, lng: 168.6626 },
  { name: "Istanbul", lat: 41.0256, lng: 28.9741 },
  { name: "Cusco", lat: -13.5165, lng: -71.9781 },
  { name: "Kyoto", lat: 34.9949, lng: 135.7850 },
];
