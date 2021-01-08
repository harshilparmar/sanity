import {
  HotkeyOptions,
  PortableTextBlock,
  // PortableTextEditable,
  // PortableTextFeatures,
  RenderAnnotationFunction,
  RenderBlockFunction,
  RenderChildFunction,
  RenderDecoratorFunction,
  EditorSelection,
  OnPasteFn,
  OnCopyFn,
  PortableTextEditor,
  usePortableTextEditor,
} from '@sanity/portable-text-editor'
import {Marker} from '@sanity/types'
import {Box, Card, Container, Flex, Layer, Theme, ThemeColorProvider, useLayer} from '@sanity/ui'
// import {FOCUS_TERMINATOR} from '@sanity/util/paths'
import React, {useMemo, useEffect} from 'react'
import styled, {css} from 'styled-components'
import PatchEvent from '../../../PatchEvent'
import {ScrollContainer} from '../../../transitional/ScrollContainer'
import {Toolbar} from './Toolbar/Toolbar'
import {ExpandCollapseButton} from './expandCollapseButton'
import {BlockExtrasOverlay} from './BlockExtrasOverlay'
import {Editable} from './Editable'
import {RenderBlockActions, RenderCustomMarkers} from './types'
import {Decorator} from './Text/Decorator'

type Props = {
  initialSelection?: EditorSelection
  isFullscreen: boolean
  markers: Array<Marker>
  hasFocus: boolean
  hotkeys: HotkeyOptions
  // onBlur: () => void
  onCopy?: OnCopyFn
  onFocus: (Path) => void
  onFormBuilderChange: (change: PatchEvent) => void
  onPaste?: OnPasteFn
  onToggleFullscreen: () => void
  // portableTextFeatures: PortableTextFeatures
  readOnly: boolean | null
  renderAnnotation: RenderAnnotationFunction
  renderBlock: RenderBlockFunction
  renderBlockActions?: RenderBlockActions
  renderChild: RenderChildFunction
  renderCustomMarkers?: RenderCustomMarkers
  setPortalElement?: (el: HTMLDivElement | null) => void
  setScrollContainerElement: (el: HTMLElement | null) => void
  value: PortableTextBlock[] | undefined
}

const Root = styled(Card)(({theme}: {theme: Theme}) => {
  const {input} = theme.sanity.color

  return css`
    &[data-focused] {
      box-shadow: 0 0 0 1px var(--card-focus-ring-color);
      border-color: var(--card-focus-ring-color);
    }

    &:not([data-focused]):not([data-read-only]) {
      @media (hover: hover) {
        &:hover {
          border-color: ${input.default.hovered.border};
        }
      }
    }

    &[data-fullscreen] {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
  `
})

const Header = styled(Flex)(({theme}: {theme: Theme}) => {
  const {input} = theme.sanity.color

  return css`
    *:not([data-fullscreen]) > & {
      background-color: ${input.default.enabled.bg};
      border-bottom: 1px solid ${input.default.enabled.border};
    }

    *[data-fullscreen] > & {
      box-sizing: border-box;
      width: 100%;
      border: 0;

      &:after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        bottom: -1px;
        border-bottom: 1px solid ${input.default.enabled.border};
      }
    }

    *[data-read-only] > & {
      background-color: ${input.default.disabled.bg};
    }
  `
})

const Content = styled(Card)`
  height: 15rem;
  position: relative;

  [data-fullscreen] & {
    min-height: 0;
    flex: 1;
    height: 100%;
  }
`

const EditableContainer = styled(Container)`
  position: relative;
  height: 100%;
`

const renderDecorator: RenderDecoratorFunction = (mark, markerType, attributes, defaultRender) => {
  return <Decorator mark={mark}>{defaultRender()}</Decorator>
}

export function PortableTextSanityEditor(props: Props) {
  const {
    hasFocus,
    hotkeys: hotkeysProp,
    initialSelection,
    isFullscreen,
    markers,
    onCopy,
    onFocus,
    onFormBuilderChange,
    onPaste,
    onToggleFullscreen,
    readOnly,
    renderAnnotation,
    renderBlock,
    renderBlockActions,
    renderChild,
    renderCustomMarkers,
    setPortalElement,
    setScrollContainerElement,
    value,
  } = props

  const editor = usePortableTextEditor()
  const ptFeatures = useMemo(() => PortableTextEditor.getPortableTextFeatures(editor), [editor])
  const {isTopLayer} = useLayer()

  // const handleOpenObjectHotkey = (
  //   event: React.BaseSyntheticEvent,
  //   ptEditor: PortableTextEditor
  // ) => {
  //   const selection = PortableTextEditor.getSelection(ptEditor)
  //   if (selection) {
  //     event.preventDefault()
  //     event.stopPropagation()
  //     const {focus} = selection
  //     const activeAnnotations = PortableTextEditor.activeAnnotations(ptEditor)
  //     const focusBlock = PortableTextEditor.focusBlock(ptEditor)
  //     const focusChild = PortableTextEditor.focusChild(ptEditor)
  //     if (activeAnnotations.length > 0) {
  //       onFocus([
  //         ...focus.path.slice(0, 1),
  //         'markDefs',
  //         {_key: activeAnnotations[0]._key},
  //         FOCUS_TERMINATOR,
  //       ])
  //       return
  //     }
  //     if (focusChild && PortableTextEditor.isVoid(ptEditor, focusChild)) {
  //       onFocus([...focus.path, FOCUS_TERMINATOR])
  //       return
  //     }
  //     if (focusBlock && PortableTextEditor.isVoid(ptEditor, focusBlock)) {
  //       onFocus([...focus.path.slice(0, 1), FOCUS_TERMINATOR])
  //     }
  //   }
  // }

  const customFromProps: HotkeyOptions = useMemo(
    () => ({
      custom: {
        'mod+enter': onToggleFullscreen,
        // @todo: disabled for now, enable when we agree on the hotkey
        // 'mod+o': handleOpenObjectHotkey,
        ...(hotkeysProp || {}).custom,
      },
    }),
    [hotkeysProp, onToggleFullscreen]
  )

  const defaultHotkeys = {marks: {}}
  ptFeatures.decorators.forEach((dec) => {
    switch (dec.value) {
      case 'strong':
        defaultHotkeys.marks['mod+b'] = dec.value
        break
      case 'em':
        defaultHotkeys.marks['mod+i'] = dec.value
        break
      case 'underline':
        defaultHotkeys.marks['mod+u'] = dec.value
        break
      case 'code':
        defaultHotkeys.marks["mod+'"] = dec.value
        break
      default:
      // Nothing
    }
  })

  const marksFromProps: HotkeyOptions = useMemo(
    () => ({marks: {...defaultHotkeys.marks, ...(hotkeysProp || {}).marks}}),
    [defaultHotkeys.marks, hotkeysProp]
  )

  const hotkeys: HotkeyOptions = useMemo(
    () => ({
      ...marksFromProps,
      ...customFromProps,
    }),
    [customFromProps, marksFromProps]
  )

  useEffect(() => {
    if (!isTopLayer || !isFullscreen) return undefined

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onToggleFullscreen()
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown)
    }
  }, [isFullscreen, isTopLayer, onToggleFullscreen])

  return (
    <Root
      border={!isFullscreen}
      data-focused={hasFocus ? '' : undefined}
      data-fullscreen={isFullscreen ? '' : undefined}
      data-read-only={readOnly ? '' : undefined}
      overflow="hidden"
      radius={isFullscreen ? 0 : 1}
    >
      <Layer zOffset={1000}>
        <Header>
          <Box flex={1}>
            <Toolbar
              isFullscreen={isFullscreen}
              hotkeys={hotkeys}
              onFocus={onFocus}
              renderBlock={renderBlock}
              readOnly={readOnly}
            />
          </Box>

          <Card borderLeft padding={isFullscreen ? 2 : 1} style={{lineHeight: 0}}>
            <ExpandCollapseButton
              isFullscreen={isFullscreen}
              onToggleFullscreen={onToggleFullscreen}
            />
          </Card>
        </Header>
      </Layer>

      <Content tone="transparent">
        <ScrollContainer ref={setScrollContainerElement} style={{height: '100%', overflow: 'auto'}}>
          <EditableContainer sizing="border" style={{paddingRight: '2rem'}} width={1}>
            <BlockExtrasOverlay
              isFullscreen={isFullscreen}
              markers={markers}
              onFocus={onFocus}
              onChange={onFormBuilderChange}
              renderBlockActions={readOnly ? undefined : renderBlockActions}
              renderCustomMarkers={renderCustomMarkers}
              value={value}
            />

            <ThemeColorProvider tone="default">
              <Editable
                hotkeys={hotkeys}
                initialSelection={initialSelection}
                onCopy={onCopy}
                onPaste={onPaste}
                renderAnnotation={renderAnnotation}
                renderBlock={renderBlock}
                renderChild={renderChild}
                renderDecorator={renderDecorator}
                value={value}
              />
            </ThemeColorProvider>
          </EditableContainer>
        </ScrollContainer>

        <div data-portal="" ref={setPortalElement} />
      </Content>
    </Root>
  )
}
