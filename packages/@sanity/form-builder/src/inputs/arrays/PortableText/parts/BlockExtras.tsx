// Imported from:
// part:@sanity/form-builder/input/block-editor/block-extras

import {useZIndex} from '@sanity/base/components'
import {Layer} from '@sanity/ui'
import React from 'react'
import {ChangeIndicatorWithProvidedFullPath} from '@sanity/base/lib/change-indicators'
import {isKeySegment, Marker, Path} from '@sanity/types'
import {
  PortableTextBlock,
  PortableTextEditor,
  usePortableTextEditor,
} from '@sanity/portable-text-editor'
import styled from 'styled-components'
import {BlockMarkers} from '../../../../legacyImports'
import {RenderCustomMarkers} from '../types'
import {getValidationMarkers} from './helpers'

interface BlockExtrasProps {
  block: PortableTextBlock
  blockActions?: React.ReactNode
  height: number
  isFullscreen: boolean
  markers: Marker[]
  onFocus: (path: Path) => void
  renderCustomMarkers?: RenderCustomMarkers
}

const Root = styled(Layer)`
  width: 100%;
  box-sizing: border-box;
`

const Container = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  width: 2em;
  height: 100%;
  pointer-events: all;

  & > div {
    flex: 1;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`

const ChangeIndicatorBox = styled.div`
  position: absolute;
  top: 0;
  left: -1px;
  bottom: 0;
`

export default function BlockExtras(props: BlockExtrasProps) {
  const {block, blockActions, height, isFullscreen, markers, onFocus, renderCustomMarkers} = props
  const editor = usePortableTextEditor()
  const zindex = useZIndex()
  const blockValidation = getValidationMarkers(markers)
  const errors = blockValidation.filter((mrkr) => mrkr.level === 'error')
  const warnings = blockValidation.filter((mrkr) => mrkr.level === 'warning')
  // const empty = markers.length === 0 && !blockActions
  const path = PortableTextEditor.getSelection(editor)?.focus.path
  const hasFocus = path && isKeySegment(path[0]) ? path[0]._key === block._key : false
  const renderChangeIndicator = isFullscreen && path && isKeySegment(path[0])

  return (
    <Root
      data-ui="BlockExtras"
      // hasFocus && styles.hasFocus,
      // isFullscreen && styles.hasFullScreen,
      // errors.length > 0 && styles.withError,
      // warnings.length > 0 && !errors.length && styles.withWarning,
      zOffset={zindex.portal}
    >
      <Container style={{height}}>
        <div>
          {markers.length > 0 && (
            <BlockMarkers
              markers={markers}
              scopedValidation={blockValidation}
              onFocus={onFocus}
              renderCustomMarkers={renderCustomMarkers}
            />
          )}

          {blockActions}

          {renderChangeIndicator && (
            <ChangeIndicatorBox>
              <ChangeIndicatorWithProvidedFullPath
                compareDeep
                value={block}
                hasFocus={hasFocus}
                path={[{_key: block._key}]}
              >
                <div style={{width: 2, height}} />
              </ChangeIndicatorWithProvidedFullPath>
            </ChangeIndicatorBox>
          )}
        </div>
      </Container>
    </Root>
  )
}
