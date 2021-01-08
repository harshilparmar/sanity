import React, {useState, useEffect, useMemo, useLayoutEffect, useCallback} from 'react'
import {Path, Marker} from '@sanity/types'
import {FormFieldPresence} from '@sanity/base/presence'
import {
  PortableTextBlock,
  PortableTextEditor,
  compactPatches,
  usePortableTextEditor,
} from '@sanity/portable-text-editor'
import {get, debounce} from 'lodash'
import {applyAll} from '../../../../simplePatch'
import type {Patch} from '../../../../patch/types'
import {PatchEvent} from '../../../../PatchEvent'
import {ObjectEditData} from '../types'
import {ModalType} from '../../ArrayOfObjectsInput/types'
import {DefaultObjectEditing} from './renderers/DefaultObjectEditing'
import {PopoverObjectEditing} from './renderers/PopoverObjectEditing'
import {FullscreenObjectEditing} from './renderers/FullscreenObjectEditing'
import {findObjectAndType} from './helpers'

const PATCHES: WeakMap<PortableTextEditor, Patch[]> = new WeakMap()
const IS_THROTTLING: WeakMap<PortableTextEditor, boolean> = new WeakMap()
const THROTTLE_MS = 300

interface EditObjectProps {
  focusPath: Path
  markers: Marker[]
  objectEditData: ObjectEditData
  onBlur: () => void
  onChange: (patchEvent: PatchEvent, editPath: Path) => void
  onClose: () => void
  onFocus: (path: Path) => void
  presence: FormFieldPresence[]
  readOnly: boolean
  value: PortableTextBlock[] | undefined
}

export function EditObject({
  focusPath,
  markers,
  objectEditData,
  onBlur,
  onChange,
  onClose,
  onFocus,
  presence,
  readOnly,
  value,
}: EditObjectProps) {
  const editor = usePortableTextEditor()
  const ptFeatures = PortableTextEditor.getPortableTextFeatures(editor)
  const [_object, type] = useMemo(() => findObjectAndType(objectEditData, value, ptFeatures), [
    objectEditData,
    ptFeatures,
    value,
  ])
  const [object, setObject] = useState(_object)
  const [timeoutInstance, setTimeoutInstance] = useState(undefined)
  const {formBuilderPath, kind} = objectEditData

  const cancelThrottle = useMemo(
    () =>
      debounce(() => {
        IS_THROTTLING.set(editor, false)
      }, THROTTLE_MS),
    [editor]
  )

  const sendPatches = useCallback(() => {
    if (IS_THROTTLING.get(editor) === true) {
      cancelThrottle()
      clearInterval(timeoutInstance)
      setTimeoutInstance(setTimeout(sendPatches, THROTTLE_MS + 100))
      return
    }
    const patches = PATCHES.get(editor)
    if (!patches || patches.length === 0) {
      return
    }
    const length = patches.length
    const _patches = compactPatches(PATCHES.get(editor).slice(0, length))
    PATCHES.set(editor, PATCHES.get(editor).slice(length))
    setTimeout(() => {
      onChange(PatchEvent.from(_patches), formBuilderPath)
    })
    cancelThrottle()
  }, [cancelThrottle, editor, formBuilderPath, onChange, timeoutInstance])

  // Initialize weakmaps on mount, and send patches on unmount
  useEffect(() => {
    PATCHES.set(editor, [])
    IS_THROTTLING.set(editor, false)
    return () => {
      sendPatches()
      PATCHES.delete(editor)
      IS_THROTTLING.delete(editor)
    }
  }, [editor, sendPatches])

  useLayoutEffect(() => {
    setObject(_object)
  }, [_object])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  const handleChange = useCallback(
    (patchEvent: PatchEvent) => {
      setObject(applyAll(object, patchEvent.patches))
      const patches = PATCHES.get(editor)
      IS_THROTTLING.set(editor, true)
      if (patches) {
        PATCHES.set(editor, PATCHES.get(editor).concat(patchEvent.patches))
        sendPatches()
      }
    },
    [editor, object, sendPatches]
  )

  if (!objectEditData) {
    return null
  }

  if (!object || !type) {
    return null
  }

  const editModalLayout: ModalType = get(type, 'options.editModal')

  if (editModalLayout === 'fullscreen') {
    return (
      <FullscreenObjectEditing
        focusPath={focusPath}
        markers={markers}
        object={object}
        onBlur={onBlur}
        onChange={handleChange}
        onClose={handleClose}
        onFocus={onFocus}
        path={formBuilderPath}
        presence={presence}
        readOnly={readOnly}
        type={type}
      />
    )
  }

  if (editModalLayout === 'popover' || kind === 'annotation') {
    return (
      <PopoverObjectEditing
        focusPath={focusPath}
        editorPath={objectEditData.editorPath}
        markers={markers}
        object={object}
        onBlur={onBlur}
        onChange={handleChange}
        onClose={handleClose}
        onFocus={onFocus}
        path={formBuilderPath}
        presence={presence}
        readOnly={readOnly}
        type={type}
      />
    )
  }

  return (
    <DefaultObjectEditing
      focusPath={focusPath}
      markers={markers}
      object={object}
      onBlur={onBlur}
      onChange={handleChange}
      onClose={handleClose}
      onFocus={onFocus}
      path={formBuilderPath}
      presence={presence}
      readOnly={readOnly}
      type={type}
    />
  )
}
