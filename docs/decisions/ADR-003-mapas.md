# ADR-003: Mapas en Android y web

- Estado: aceptado
- Fecha: 2026-10-30

## Contexto

La app debe mostrar profesionales cercanos, permitir elegir la ubicacion del
taller y seleccionar el punto de servicio. El mismo codigo corre en Android y
web, pero las librerias de mapas nativas no funcionan en el navegador.

## Decision

- Android: `react-native-maps` con teselas OpenStreetMap mediante `UrlTile`.
- Web: Leaflet cargado dinamicamente con teselas OpenStreetMap.
- Se expone una interfaz comun (`MapViewProps`, `LatLng`, `MapMarker`) y dos
  implementaciones resueltas por plataforma: `MapView.native.tsx` y
  `MapView.web.tsx`.
- `MapView.tsx` solo reexporta la version nativa para que TypeScript resuelva el
  modulo; Metro elige el archivo correcto segun la plataforma.
- No se usa una clave de Google Maps en el MVP.

## Consecuencias

- No se requiere facturacion de Google Maps para el piloto.
- La precision y disponibilidad dependen de OpenStreetMap; se debe respetar la
  atribucion y los limites de uso.
- La geocodificacion inversa queda pendiente de proveedor (DP-03); por ahora se
  guarda direccion textual y coordenadas elegidas en el mapa.
