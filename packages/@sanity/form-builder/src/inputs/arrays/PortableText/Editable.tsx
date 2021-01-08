import {
  EditorSelection,
  HotkeyOptions,
  OnCopyFn,
  OnPasteFn,
  PortableTextBlock,
  PortableTextEditable,
  RenderAnnotationFunction,
  RenderBlockFunction,
  RenderChildFunction,
  RenderDecoratorFunction,
} from '@sanity/portable-text-editor'
import {rem, Theme} from '@sanity/ui'
import React from 'react'
import styled, {css} from 'styled-components'

interface EditableProps {
  hotkeys: HotkeyOptions
  initialSelection?: EditorSelection
  onCopy?: OnCopyFn
  onPaste?: OnPasteFn
  renderAnnotation: RenderAnnotationFunction
  renderBlock: RenderBlockFunction
  renderChild: RenderChildFunction
  renderDecorator: RenderDecoratorFunction
  value: PortableTextBlock[] | undefined
}

const Root = styled.div(({theme}: {theme: Theme}) => {
  const {media, space} = theme.sanity
  const {input} = theme.sanity.color

  return css`
    position: relative;
    min-height: 100%;
    display: flex;
    flex-direction: column;

    & .pt-editable {
      background-color: ${input.default.enabled.bg};
      color: ${input.default.enabled.fg};
      flex: 1;
      min-height: 0;
      height: 100%;
      padding: ${rem(space[3])};
      overflow: auto;

      [data-read-only] & {
        background-color: ${input.default.disabled.bg};
        color: ${input.default.disabled.fg};
      }

      /* [data-disabled] & {
        background-color: ${input.default.disabled.bg};
        color: ${input.default.disabled.fg};
      } */

      /* [data-focused] & {
        background-color: var(--input-bg-focus);
      } */

      [data-fullscreen] & {
        padding: ${rem(space[3])};

        @media screen and (min-width: ${media[0]}px) {
          padding: ${rem(space[4])};
        }

        @media screen and (min-width: ${media[1]}px) {
          padding: ${rem(space[5])};
        }
      }

      & [data-slate-placeholder='true'] {
        color: ${input.default.enabled.placeholder};
        opacity: 1 !important;
      }

      & > div:first-child > * {
        margin-top: 0;
      }

      & > div:last-child > * {
        margin-bottom: 0;
      }

      & > div[class~='pt-object-block'] {
        margin: ${rem(space[4])} 0;

        &:first-child {
          margin-top: 0;
        }

        &:last-child {
          margin-top: 0;
        }
      }

      /* space between different types of lists */
      & > div[class~='pt-list-item-bullet'] + div[class~='pt-list-item-number'],
      & > div[class~='pt-list-item-number'] + div[class~='pt-list-item-bullet'] {
        margin-top: ${rem(space[3])};
      }
    }
  `
})

export function Editable(props: EditableProps) {
  const {
    hotkeys,
    initialSelection,
    onCopy,
    onPaste,
    renderAnnotation,
    renderBlock,
    renderChild,
    renderDecorator,
    value,
  } = props

  return (
    <Root>
      <PortableTextEditable
        hotkeys={hotkeys}
        onCopy={onCopy}
        onPaste={onPaste}
        placeholderText={value ? undefined : 'Empty'}
        renderAnnotation={renderAnnotation}
        renderBlock={renderBlock}
        renderChild={renderChild}
        renderDecorator={renderDecorator}
        selection={initialSelection}
        spellCheck
      />
    </Root>
  )
}
