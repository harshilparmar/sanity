import {Marker, ValidationMarker} from '@sanity/types'

export function getValidationMarkers(markers: Marker[]): ValidationMarker[] {
  const validation = markers.filter((marker) => marker.type === 'validation')

  return validation.map((marker) => {
    if (marker.path.length <= 1) {
      return marker
    }

    const level = marker.level === 'error' ? 'errors' : 'warnings'

    return {
      ...marker,
      item: marker.item.cloneWithMessage(`Contains ${level}`),
    }
  })
}
