import {PortableTextChild, Type, RenderAttributes} from '@sanity/portable-text-editor'
import {Path, Marker, isValidationErrorMarker} from '@sanity/types'
import {Card} from '@sanity/ui'
import {FOCUS_TERMINATOR} from '@sanity/util/paths'
import {isEqual} from 'lodash'
import React, {useCallback} from 'react'
import styled from 'styled-components'
import Preview from '../../../../Preview'
// import {PatchEvent} from '../../../../PatchEvent'

interface InlineObjectProps {
  value: PortableTextChild
  type: Type
  attributes: RenderAttributes
  readOnly: boolean
  markers: Marker[]
  onFocus: (path: Path) => void
  // onChange: (patchEvent: PatchEvent, path: Path) => void
}

const Root = styled(Card)`
  &:not([hidden]) {
    display: inline-flex;
  }
  position: relative;
  min-width: 11px;
  max-width: 120px;

  &[data-errors='true'] {
    /* @todo */
    outline: 2px solid #f00;
  }

  &[data-selected='true'] {
    /* @todo */
    outline: 2px solid #000;
  }

  &[data-focused='true'] {
    /* @todo */
    outline: 2px solid #00f;
  }
`

export function InlineObject({
  value,
  type,
  markers,
  attributes: {focused, selected, path},
  onFocus,
  readOnly,
}: InlineObjectProps) {
  const errors = markers.filter(isValidationErrorMarker)

  const handleOpen = useCallback(() => {
    if (focused) {
      onFocus(path.concat(FOCUS_TERMINATOR))
    }
  }, [focused, onFocus, path])

  const isEmpty = !value || isEqual(Object.keys(value), ['_key', '_type'])

  return (
    <Root
      border
      data-focused={focused}
      data-selected={selected}
      onClick={handleOpen}
      tone={errors.length > 0 ? 'critical' : undefined}
    >
      {!isEmpty && <Preview type={type} value={value} layout="inline" />}
      {isEmpty && !readOnly && <span>Click to edit</span>}
    </Root>
  )
}
