// Imported from:
// part:@sanity/form-builder/input/block-editor/block-markers

import {Box, Flex} from '@sanity/ui'
import React from 'react'
import {Path, Marker, isValidationMarker} from '@sanity/types'
import {BlockMarkersCustomDefault} from '../../../../legacyImports'
import {FormFieldValidationStatus} from '../../../../components/FormField'
import {RenderCustomMarkers} from '../types'

interface MarkersProps {
  markers: Marker[]
  onFocus: (path: Path) => void
  renderCustomMarkers?: RenderCustomMarkers
}

export default class Markers extends React.PureComponent<MarkersProps> {
  static defaultProps = {
    markers: [],
    renderCustomMarkers: null,
  }

  handleValidationMarkerClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    event.preventDefault()
    event.stopPropagation()
    const {onFocus, markers} = this.props
    const validationMarkers = markers.filter(isValidationMarker)
    onFocus(validationMarkers[0].path)
  }

  handleCancelEvent = (event: React.MouseEvent<HTMLDivElement>): void => {
    event.preventDefault()
    event.stopPropagation()
  }

  render(): JSX.Element {
    const {markers, renderCustomMarkers} = this.props

    if (markers.length === 0) {
      return null
    }

    const customMarkers = markers.filter((mrkr) => !isValidationMarker(mrkr))
    const validationMarkers = markers.filter(isValidationMarker)

    return (
      <Flex
        onClick={this.handleCancelEvent}
        // style={{outline: '1px solid #f00', outlineOffset: -1}}
      >
        {validationMarkers.length > 0 && (
          <Box onClick={this.handleValidationMarkerClick}>
            <FormFieldValidationStatus markers={validationMarkers} />
          </Box>
        )}

        {customMarkers.length > 0 && (
          <Box onClick={this.handleCancelEvent}>
            {renderCustomMarkers && renderCustomMarkers(customMarkers)}
            {!renderCustomMarkers && <BlockMarkersCustomDefault markers={markers} />}
          </Box>
        )}
      </Flex>
    )
  }
}
