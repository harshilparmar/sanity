import React from 'react'
import styled from 'styled-components'

interface DecoratorProps {
  mark: string
  children: React.ReactNode
}

const Root = styled.span`
  display: inline;

  &[data-mark='strong'] {
    /* font-weight: 700; */
  }

  &[data-mark='em'] {
    /* font-style: italic; */
  }

  &[data-mark='underline'] {
    /* text-decoration: underline; */
  }

  &[data-mark='overline'] {
    text-decoration: overline;
  }

  &[data-mark='strike-through'] {
    text-decoration: line-through;
  }

  &[data-mark='code'] {
    /* font-family: var(--font-family-monospace); */
    /* background: color(var(--text-color) alpha(5%)); */
  }
`

const MARK_TAGS = {
  strong: 'strong',
  em: 'em',
  underline: 'u',
  overline: 'span',
  'strike-through': 'span',
  code: 'code',
}

export function Decorator(props: DecoratorProps) {
  const {children, mark} = props
  const as = MARK_TAGS[mark] || 'span'

  return (
    <Root as={as} data-mark={mark}>
      {children}
    </Root>
  )
}
