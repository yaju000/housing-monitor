import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import '../utils/leafletIcons'

// Recenter map when position changes
function RecenterMap({ lat, lng }) {
  const map = useMap()
  useEffect(() => {
    if (lat && lng) map.setView([lat, lng], 15)
  }, [lat, lng, map])
  return null
}

const POI_OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

async function fetchNearbyPOI(lat, lng, radius = 800) {
  const query = `
    [out:json][timeout:10];
    (
      node["amenity"="school"](around:${radius},${lat},${lng});
      node["amenity"="supermarket"](around:${radius},${lat},${lng});
      node["railway"="station"](around:${radius},${lat},${lng});
      node["station"="subway"](around:${radius},${lat},${lng});
    );
    out body;
  `
  const resp = await fetch(POI_OVERPASS_URL, {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
  })
  const data = await resp.json()
  return data.elements || []
}

const POI_LABELS = {
  school: '🏫 學校',
  supermarket: '🛒 超市',
  station: '🚉 車站',
}

function getPOILabel(el) {
  if (el.tags?.amenity === 'school') return POI_LABELS.school
  if (el.tags?.amenity === 'supermarket') return POI_LABELS.supermarket
  return POI_LABELS.station
}

export default function ProjectMap({ lat, lng, projectName }) {
  const [pois, setPois] = useState([])

  useEffect(() => {
    if (!lat || !lng) return
    fetchNearbyPOI(lat, lng).then(setPois).catch(() => {})
  }, [lat, lng])

  if (!lat || !lng) {
    return <div className="bg-gray-100 rounded h-64 flex items-center justify-center text-gray-400">無地圖資料</div>
  }

  return (
    <MapContainer center={[lat, lng]} zoom={15} className="h-64 w-full rounded">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterMap lat={lat} lng={lng} />
      <Marker position={[lat, lng]}>
        <Popup>{projectName}</Popup>
      </Marker>
      {pois.map(poi => (
        poi.lat && poi.lon ? (
          <Marker key={poi.id} position={[poi.lat, poi.lon]}>
            <Popup>{getPOILabel(poi)} {poi.tags?.name || ''}</Popup>
          </Marker>
        ) : null
      ))}
    </MapContainer>
  )
}
