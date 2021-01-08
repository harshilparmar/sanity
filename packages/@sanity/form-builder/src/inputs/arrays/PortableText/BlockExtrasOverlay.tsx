import {
  PortableTextBlock,
  PortableTextEditor,
  PortableTextFeatures,
  usePortableTextEditor,
} from '@sanity/portable-text-editor'
import {isKeySegment, Marker, Path} from '@sanity/types'
import React from 'react'
import styled from 'styled-components'
import {BlockExtras} from '../../../legacyImports'
import PatchEvent from '../../../../PatchEvent'
import createBlockActionPatchFn from './utils/createBlockActionPatchFn'
import {RenderBlockActions, RenderCustomMarkers} from './types'

interface BlockExtrasOverlayProps {
  isFullscreen: boolean
  markers: Marker[]
  onFocus: (path: Path) => void
  onChange: (event: PatchEvent) => void
  renderBlockActions?: RenderBlockActions
  renderCustomMarkers?: RenderCustomMarkers
  value: PortableTextBlock[] | undefined
}

const Root = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  pointer-events: none;
`

const BlockBox = styled.div`
  position: absolute;
  width: 100%;
`

const findBlockMarkers = (block: PortableTextBlock, markers: Marker[]): Marker[] => {
  return markers.filter(
    (marker) => isKeySegment(marker.path[0]) && marker.path[0]._key === block._key
  )
}

export function BlockExtrasOverlay(props: BlockExtrasOverlayProps) {
  const {value} = props
  const editor = usePortableTextEditor()
  const ptFeatures = PortableTextEditor.getPortableTextFeatures(editor)
  const blocks = value || []

  // Render overlay for each block
  return (
    <Root>
      {blocks.map((block) => (
        <BlockExtrasWithBlockActionsAndHeight
          {...props}
          block={block}
          ptFeatures={ptFeatures}
          key={`blockExtras-${block._key}`}
        />
      ))}
    </Root>
  )
}

interface BlockExtrasWithBlockActionsAndHeightProps {
  block: PortableTextBlock
  isFullscreen: boolean
  markers: Marker[]
  onFocus: (path: Path) => void
  onChange: (event: PatchEvent) => void
  ptFeatures: PortableTextFeatures
  renderBlockActions?: RenderBlockActions
  renderCustomMarkers?: RenderCustomMarkers
  value: PortableTextBlock[] | undefined
}

function BlockExtrasWithBlockActionsAndHeight(props: BlockExtrasWithBlockActionsAndHeightProps) {
  const {
    block,
    isFullscreen,
    markers,
    onChange,
    onFocus,
    ptFeatures,
    renderBlockActions,
    renderCustomMarkers,
    value,
  } = props
  const editor = usePortableTextEditor()
  const blockMarkers = findBlockMarkers(block, markers)
  const element = PortableTextEditor.findDOMNode(editor, block) as HTMLElement

  if (!element) {
    return null
  }

  const rect = element.getBoundingClientRect()

  let actions = null

  if (renderBlockActions) {
    const RenderComponent = renderBlockActions

    if (block) {
      actions = (
        <RenderComponent
          block={block}
          value={value}
          set={createBlockActionPatchFn('set', block, onChange, ptFeatures)}
          unset={createBlockActionPatchFn('unset', block, onChange, ptFeatures) as () => void}
          insert={createBlockActionPatchFn('insert', block, onChange, ptFeatures)}
        />
      )
    }
  }

  const top = element.scrollTop + element.offsetTop
  const height = rect.height

  return (
    <BlockBox key={`blockExtras-${block._key}`} style={{height: `${height}px`, top: `${top}px`}}>
      <BlockExtras
        block={block}
        height={height}
        isFullscreen={isFullscreen}
        blockActions={actions}
        markers={blockMarkers}
        onFocus={onFocus}
        renderCustomMarkers={renderCustomMarkers}
        value={value}
      />
    </BlockBox>
  )
}
