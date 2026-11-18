"use client";

import * as maplibregl from "maplibre-gl";

// Worker is served from /public (copied by scripts/copy-maplibre-worker.mjs).
maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

export { maplibregl };
