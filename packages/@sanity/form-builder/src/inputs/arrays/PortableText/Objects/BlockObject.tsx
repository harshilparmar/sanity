import {
  EditIcon,
  LinkIcon,
  TrashIcon,
  EyeOpenIcon,
  // ChevronDownIcon,
  EllipsisVerticalIcon,
} from '@sanity/icons'
import {
  PortableTextEditor,
  PortableTextBlock,
  Type,
  RenderAttributes,
} from '@sanity/portable-text-editor'
import {Path, Marker, isValidationErrorMarker} from '@sanity/types'
import {Box, Button, Card, Code, Flex, Menu, MenuButton, MenuItem} from '@sanity/ui'
import {FOCUS_TERMINATOR} from '@sanity/util/paths'
import React, {useCallback} from 'react'
import styled from 'styled-components'
import Preview from '../../../../Preview'
import {IntentMenuItem} from '../../../../transitional/IntentMenuItem'

interface BlockObjectProps {
  attributes: RenderAttributes
  editor: PortableTextEditor
  markers: Marker[]
  onFocus: (path: Path) => void
  readOnly: boolean
  type: Type
  value: PortableTextBlock
}

const Root = styled(Card)`
  cursor: move;
  position: relative;

  &[data-selected='true'] {
    /* @todo */
    outline: 2px solid black;
  }

  &[data-focused='true'] {
    /* @todo */
    outline: 2px solid blue;
  }
`

export function BlockObject({
  attributes: {focused, selected, path},
  editor,
  markers,
  onFocus,
  readOnly,
  type,
  value,
}: BlockObjectProps) {
  const errors = markers.filter(isValidationErrorMarker)

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (focused) {
        event.preventDefault()
        event.stopPropagation()
        onFocus(path.concat(FOCUS_TERMINATOR))
      } else {
        onFocus(path)
      }
    },
    [focused, onFocus, path]
  )

  const handleEditClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      event.preventDefault()
      event.stopPropagation()
      onFocus(path.concat(FOCUS_TERMINATOR))
    },
    [onFocus, path]
  )

  const handleDelete = useCallback(() => {
    PortableTextEditor.delete(
      editor,
      {focus: {path, offset: 0}, anchor: {path, offset: 0}},
      {mode: 'block'}
    )

    PortableTextEditor.focus(editor)
  }, [editor, path])

  return (
    <Root
      data-focused={focused}
      data-selected={selected}
      onDoubleClick={handleDoubleClick}
      radius={2}
      shadow={1}
      style={readOnly ? {cursor: 'default'} : {}}
      tone={errors.length > 0 ? 'critical' : undefined}
    >
      <Flex>
        <Box flex={1}>
          <Preview type={type} value={value} layout="block" />
        </Box>
        <Box padding={1}>
          <MenuButton
            button={
              <Button
                aria-label={type ? type.title || type.name : 'Unknown'}
                icon={EllipsisVerticalIcon}
                // iconRight={ChevronDownIcon}
                mode="bleed"
                paddingX={2}
                // text={type ? type.title || type.name : 'Unknown'}
              />
            }
            id="todo"
            menu={
              <Menu>
                {value._ref && (
                  <IntentMenuItem
                    icon={LinkIcon}
                    intent="edit"
                    params={{id: value._ref}}
                    text="Open document"
                  />
                )}
                {readOnly && <MenuItem icon={EyeOpenIcon} onClick={handleEditClick} text="View" />}
                {!readOnly && <MenuItem icon={EditIcon} onClick={handleEditClick} text="Edit" />}
                {!readOnly && (
                  <MenuItem icon={TrashIcon} onClick={handleDelete} text="Delete" tone="critical" />
                )}
              </Menu>
            }
            placement="bottom-end"
            // portal
          />
        </Box>
      </Flex>
    </Root>
  )
}
