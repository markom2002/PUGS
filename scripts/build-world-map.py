"""Build the offline map asset from Natural Earth's public-domain 1:110m land GeoJSON.

Usage: python scripts/build-world-map.py path/to/ne_110m_land.geojson
Source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson
"""
import argparse
import json
from pathlib import Path

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('geojson',type=Path)
args=parser.parse_args()
geo=json.loads(args.geojson.read_text(encoding='utf-8'))
paths=[]
for feature in geo['features']:
    geometry=feature['geometry']
    polygons=geometry['coordinates'] if geometry['type']=='MultiPolygon' else [geometry['coordinates']]
    for polygon in polygons:
        for ring in polygon:
            points=[((longitude+180)*1000/360,(90-latitude)*500/180) for longitude,latitude in ring]
            paths.append('M'+'L'.join(f'{x:.2f},{y:.2f}' for x,y in points)+'Z')
target=Path(__file__).resolve().parents[1]/'FE/src/components/map/worldLand.json'
target.write_text(json.dumps({'path':''.join(paths)},separators=(',',':'))+'\n',encoding='utf-8')
print(f'Wrote offline land outlines: {target.stat().st_size} bytes')
