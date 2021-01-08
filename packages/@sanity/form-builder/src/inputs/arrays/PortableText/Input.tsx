import {useZIndex} from '@sanity/base/components'
import {ChangeIndicatorWithProvidedFullPath} from '@sanity/base/lib/change-indicators'
import {FormFieldPresence} from '@sanity/base/presence'
import {
  getPortableTextFeatures,
  OnCopyFn,
  OnPasteFn,
  Patch as EditorPatch,
  PortableTextBlock,
  PortableTextEditor,
  Type,
  usePortableTextEditor,
  usePortableTextEditorSelection,
  HotkeyOptions,
} from '@sanity/portable-text-editor'
import {Path, isKeySegment, Marker, isKeyedObject} from '@sanity/types'
import {BoundaryElementProvider, Layer, Portal, PortalProvider} from '@sanity/ui'
import {uniqueId, isEqual} from 'lodash'
import React, {useEffect, useState, useMemo, useCallback} from 'react'
import {Subject} from 'rxjs'
import styled from 'styled-components'
import PatchEvent from '../../../PatchEvent'
import {ActivateOnFocus} from '../../../components/ActivateOnFocus'
import {BlockObject} from './Objects/BlockObject'
import {InlineObject} from './Objects/InlineObject'
import {EditObject} from './Objects/EditObject'
import {Annotation} from './Text/Annotation'
import {Blockquote} from './Text/Blockquote'
import {Header} from './Text/Header'
import {Paragraph} from './Text/Paragraph'
import {RenderBlockActions, RenderCustomMarkers, ObjectEditData} from './types'
import {PortableTextSanityEditor} from './Editor'

interface PTInputProps {
  focusPath: Path
  forceUpdate: (fromValue?: PortableTextBlock[] | undefined) => void
  hasFocus: boolean
  hotkeys: HotkeyOptions
  isFullscreen: boolean
  markers: Marker[]
  // onBlur: () => void
  onChange: (event: PatchEvent) => void
  onCopy?: OnCopyFn
  onFocus: (path: Path) => void
  onPaste?: OnPasteFn
  onToggleFullscreen: () => void
  patche$: Subject<EditorPatch>
  presence: FormFieldPresence[]
  readOnly: boolean | null
  renderBlockActions?: RenderBlockActions
  renderCustomMarkers?: RenderCustomMarkers
  type: Type
  value: PortableTextBlock[] | undefined
}

const HEADING_TEXT_STYLES = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']

const FullscreenLayer = styled(Layer)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;

  /* @media (--max-screen-medium) {
    position: fixed;
  } */
`

export function PTInput(props: PTInputProps) {
  const {
    focusPath,
    forceUpdate,
    hasFocus,
    hotkeys,
    isFullscreen,
    markers,
    // onBlur,
    onChange,
    onCopy,
    onFocus,
    onPaste,
    onToggleFullscreen,
    patche$,
    presence,
    readOnly,
    renderBlockActions,
    renderCustomMarkers,
    type,
    value,
  } = props
  const zindex = useZIndex()
  const editor = usePortableTextEditor()
  const selection = usePortableTextEditorSelection()
  const ptFeatures = getPortableTextFeatures(type)
  const [isActive, setIsActive] = useState(false)
  const [objectEditData, setObjectEditData] = useState<ObjectEditData | null>(null)
  const [initialSelection, setInitialSelection] = useState(undefined)
  const activationId = useMemo(() => uniqueId('PortableTextInput'), [])
  const [portalElement, setPortalElement] = useState<HTMLDivElement | null>(null)
  const [scrollContainerElement, setScrollContainerElement] = useState<HTMLElement | null>(null)

  // Respond to focusPath changes
  useEffect(() => {
    if (!focusPath || !hasFocus) return
    if (objectEditData) return

    const sameSelection = selection && isEqual(selection.focus.path, focusPath)

    if (sameSelection) return

    const blockSegment = isKeySegment(focusPath[0]) && focusPath[0]
    const isBlockOnly = blockSegment && focusPath.length === 1
    const isChild = blockSegment && focusPath[1] === 'children' && isKeyedObject(focusPath[2])
    const isChildOnly = isChild && focusPath.length === 3
    const isAnnotation = blockSegment && focusPath[1] === 'markDefs'

    if (isBlockOnly || isChildOnly) {
      const [node] = PortableTextEditor.findByPath(editor, focusPath)
      if (node) {
        const point = {path: focusPath, offset: 0}
        PortableTextEditor.select(editor, {focus: point, anchor: point})
        forceUpdate() // To re-render change-indicators properly
      }
    } else if (isAnnotation) {
      const block = (PortableTextEditor.getValue(editor) || []).find(
        (blk) => blk._key === blockSegment._key
      )

      const markDefSegment = focusPath[2]

      if (block && isKeySegment(markDefSegment)) {
        const span = block.children.find(
          (child: any) => Array.isArray(child.marks) && child.marks.includes(markDefSegment._key)
        )

        if (span) {
          const spanPath = [blockSegment, 'children', {_key: span._key}]

          setIsActive(true)

          PortableTextEditor.select(editor, {
            focus: {path: spanPath, offset: 0},
            anchor: {path: spanPath, offset: 0},
          })

          setObjectEditData({
            editorPath: spanPath,
            formBuilderPath: focusPath.slice(0, 3),
            kind: 'annotation',
          })
        }
      }
      return
    }

    // Block focus paths
    if ((isChild && focusPath.length > 3) || (!isChild && focusPath.length > 1)) {
      let kind: 'annotation' | 'blockObject' | 'inlineObject' = 'blockObject'
      let path = focusPath.slice(0, 1)

      if (isChild) {
        kind = 'inlineObject'
        path = path.concat(focusPath.slice(1, 3))
      }

      const [node] = PortableTextEditor.findByPath(editor, path)

      // Only if it actually exists
      if (node) {
        setIsActive(true)

        PortableTextEditor.select(editor, {
          focus: {path, offset: 0},
          anchor: {path, offset: 0},
        })

        // Make it go to selection first, then load  the editing interface
        setObjectEditData({editorPath: path, formBuilderPath: path, kind})
      }
    }
  }, [editor, focusPath, forceUpdate, hasFocus, objectEditData, selection])

  // Set as active whenever we have focus inside the editor.
  useEffect(() => {
    if (!isActive && hasFocus) setIsActive(true)
  }, [hasFocus, isActive])

  // Update the FormBuilder focusPath as we get a new selection from the editor
  // This will also set presence on that path
  useEffect(() => {
    // If the focuspath is a annotation (markDef), don't update focusPath,
    // as this will close the editing interface
    const isAnnotationPath = focusPath && focusPath[1] === 'markDefs'

    if (selection && !objectEditData && !isAnnotationPath) {
      const isCollapsed =
        isEqual(selection.focus.path, selection.anchor.path) &&
        selection.focus.offset === selection.anchor.offset

      // Only do it when anchor and focus is the same, or the component will re-render
      // in the middle of selecting multiple lines with the keyboard.
      // TODO: handle this better when we support live cursors
      if (isCollapsed && !isEqual(focusPath, selection.focus.path)) {
        onFocus(selection.focus.path)
      }
    }
  }, [focusPath, objectEditData, onFocus, selection])

  const handleToggleFullscreen = useCallback(() => {
    // console.log('PTInput.handleToggleFullscreen')
    setInitialSelection(PortableTextEditor.getSelection(editor))
    const val = PortableTextEditor.getValue(editor)
    onToggleFullscreen()
    forceUpdate(val)
    setTimeout(() => PortableTextEditor.focus(editor))
  }, [editor, forceUpdate, onToggleFullscreen])

  const focus = useCallback(() => {
    // console.log('PTInput.focus')
    PortableTextEditor.focus(editor)
  }, [editor])

  // function blur(): void {
  //   PortableTextEditor.blur(editor)
  // }

  const handleActivate = useCallback(() => {
    // console.log('PTInput.handleActivate')
    setIsActive(true)
    focus()
  }, [focus])

  const handleFormBuilderEditObjectChange = useCallback(
    (patchEvent: PatchEvent, path: Path) => {
      // console.log('PTInput.handleFormBuilderEditObjectChange')
      let _patchEvent = patchEvent
      path
        .slice(0)
        .reverse()
        .forEach((segment) => {
          _patchEvent = _patchEvent.prefixAll(segment)
        })
      _patchEvent.patches.map((patch) => patche$.next(patch))
      onChange(_patchEvent)
    },
    [onChange, patche$]
  )

  const handleEditObjectFormBuilderFocus = useCallback(
    (nextPath: Path) => {
      // console.log('PTInput.handleEditObjectFormBuilderFocus')
      // console.log('handleEditObjectFormBuilderFocus', objectEditData, nextPath)

      if (objectEditData && nextPath) {
        onFocus(nextPath)
      }
    },
    [objectEditData, onFocus]
  )

  const handleEditObjectFormBuilderBlur = useCallback(() => {
    // Do nothing
  }, [])

  const renderBlock = useCallback(
    (block, blockType, attributes, defaultRender) => {
      const isTextBlock = block._type === ptFeatures.types.block.name

      if (isTextBlock) {
        // Block is blockquote
        if (block.style === 'blockquote') {
          return <Blockquote>{defaultRender(block)}</Blockquote>
        }

        // Block is heading
        if (HEADING_TEXT_STYLES.includes(block.style)) {
          return <Header block={block}>{defaultRender(block)}</Header>
        }

        // Block is paragraph
        return <Paragraph>{defaultRender(block)}</Paragraph>
      }

      return (
        <BlockObject
          attributes={attributes}
          editor={editor}
          markers={markers.filter(
            (marker) => isKeySegment(marker.path[0]) && marker.path[0]._key === block._key
          )}
          // onChange={handleFormBuilderEditObjectChange}
          onFocus={onFocus}
          readOnly={readOnly}
          type={blockType}
          value={block}
        />
      )
    },
    [
      editor,
      // handleFormBuilderEditObjectChange,
      markers,
      onFocus,
      ptFeatures,
      readOnly,
    ]
  )

  const renderChild = useCallback(
    (child, childType, attributes, defaultRender) => {
      const isSpan = child._type === ptFeatures.types.span.name
      if (isSpan) {
        return defaultRender(child)
      }
      // eslint-disable-next-line react/prop-types
      const inlineMarkers = markers.filter(
        (marker) => isKeySegment(marker.path[2]) && marker.path[2]._key === child._key
      )
      return (
        <InlineObject
          attributes={attributes}
          markers={inlineMarkers}
          // onChange={handleFormBuilderEditObjectChange}
          onFocus={onFocus}
          readOnly={readOnly}
          type={childType}
          value={child}
        />
      )
    },
    [
      // handleFormBuilderEditObjectChange,
      markers,
      onFocus,
      ptFeatures,
      readOnly,
    ]
  )

  const renderAnnotation = useCallback(
    (annotation, annotationType, attributes, defaultRender) => {
      const annotationMarkers = markers.filter(
        (marker) => isKeySegment(marker.path[2]) && marker.path[2]._key === annotation._key
      )

      return (
        <Annotation
          attributes={attributes}
          markers={annotationMarkers}
          // onChange={handleFormBuilderEditObjectChange}
          onFocus={onFocus}
          // readOnly={readOnly}
          // type={annotationType}
          value={annotation}
        >
          {defaultRender()}
        </Annotation>
      )
    },
    [
      // handleFormBuilderEditObjectChange,
      markers,
      onFocus,
      // readOnly,
    ]
  )

  const handleEditObjectClose = useCallback(() => {
    if (objectEditData) {
      const {editorPath} = objectEditData

      setObjectEditData(null)

      const sel = {
        focus: {path: editorPath, offset: 0},
        anchor: {path: editorPath, offset: 0},
      }

      onFocus(editorPath)
      PortableTextEditor.select(editor, sel)
      setInitialSelection(sel)
    }

    focus()
  }, [editor, focus, objectEditData, onFocus])

  const ptEditor = (
    <PortableTextSanityEditor
      hasFocus={hasFocus}
      hotkeys={hotkeys}
      initialSelection={initialSelection}
      isFullscreen={isFullscreen}
      key={`editor-${activationId}-${isFullscreen ? 'portal' : 'child'}`}
      markers={markers}
      // onBlur={onBlur}
      onFocus={onFocus}
      onFormBuilderChange={onChange}
      onCopy={onCopy}
      onPaste={onPaste}
      onToggleFullscreen={handleToggleFullscreen}
      // portableTextFeatures={ptFeatures}
      readOnly={isActive === false || readOnly}
      renderAnnotation={renderAnnotation}
      renderBlock={renderBlock}
      renderBlockActions={renderBlockActions}
      renderChild={renderChild}
      renderCustomMarkers={renderCustomMarkers}
      setPortalElement={setPortalElement}
      setScrollContainerElement={setScrollContainerElement}
      value={value}
    />
  )

  const editObject = objectEditData && (
    <EditObject
      focusPath={focusPath}
      objectEditData={objectEditData}
      // TODO: filter relevant
      markers={markers}
      onBlur={handleEditObjectFormBuilderBlur}
      onChange={handleFormBuilderEditObjectChange}
      onClose={handleEditObjectClose}
      onFocus={handleEditObjectFormBuilderFocus}
      readOnly={readOnly}
      presence={presence}
      value={value}
    />
  )

  if (isFullscreen) {
    return (
      <Portal key={`portal-${activationId}`}>
        <PortalProvider element={portalElement}>
          <BoundaryElementProvider element={scrollContainerElement}>
            <FullscreenLayer zOffset={zindex.pane - 2}>{ptEditor}</FullscreenLayer>
            {editObject}
          </BoundaryElementProvider>
        </PortalProvider>
      </Portal>
    )
  }

  return (
    <>
      <ActivateOnFocus inputId={activationId} isActive={isActive} onActivate={handleActivate}>
        <ChangeIndicatorWithProvidedFullPath
          compareDeep
          value={value}
          hasFocus={hasFocus && objectEditData === null}
          path={[]}
        >
          {ptEditor}
        </ChangeIndicatorWithProvidedFullPath>
      </ActivateOnFocus>

      {editObject}
    </>
  )
}
