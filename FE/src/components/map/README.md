# Offline quiz map

`worldLand.json` contains an equirectangular SVG path, projected into a 1000 × 500 coordinate space. Longitude −180…180 maps to x=0…1000; latitude 90…−90 maps to y=0…500. The asset is imported into the JavaScript bundle, so the existing PWA cache includes it automatically. There are no map tile servers, API keys or network requests during play.

The land outlines are from [Natural Earth 1:110m land](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson), downloaded on 2026-11-16. Natural Earth makes its map data available in the [public domain](https://www.naturalearthdata.com/about/terms-of-use/). The displayed attribution identifies the source even though attribution is not required.

To regenerate the derived asset, download that GeoJSON and run:

```text
python scripts/build-world-map.py path/to/ne_110m_land.geojson
```

The map intentionally has no place labels. Targets use approximate city/landmark centers from `BE/Arena/Data/map-questions.json`; the maximum-score radius is 50 km. Zoom and pan work with the local asset. Pointer positions are transformed through the SVG screen matrix, including scaling and letterboxing. Keyboard arrows move the marker; Enter submits it.
