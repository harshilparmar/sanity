import {Card, Heading, useClickOutside} from '@sanity/ui'
import React, {useCallback, useState} from 'react'
import styled from 'styled-components'

interface ActivateOnFocusProps {
  message?: string
  html?: React.ReactNode
  isActive?: boolean
  onActivate?: () => void
  overlayClassName?: string
  inputId?: string
}

const Root = styled.div`
  position: relative;
`

const Overlay = styled(Card)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  box-sizing: border-box;
  z-index: 2;
  opacity: 0;
  outline: none;

  & > div {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &:hover {
    opacity: 1;
  }
`

const Content = styled.div`
  position: relative;
  z-index: 1;
`

export function ActivateOnFocus(
  props: ActivateOnFocusProps & Omit<React.HTMLProps<HTMLDivElement>, 'as'>
) {
  const {
    children,
    html,
    inputId,
    isActive,
    message = 'Click to activate',
    onActivate,
    overlayClassName,
    ...restProps
  } = props
  const [rootElement, setRootElement] = useState<HTMLDivElement | null>(null)
  const [focused, setFocused] = useState(false)

  const handleClick = useCallback(() => {
    if (!focused) {
      setFocused(true)
      if (onActivate) onActivate()
    }
  }, [focused, onActivate])

  const handleClickOutside = useCallback(() => {
    if (focused) setFocused(false)
  }, [focused])

  useClickOutside(handleClickOutside, [rootElement])

  return (
    <Root
      data-ui="ActivateOnFocus"
      {...restProps}
      data-focused={focused}
      id={inputId}
      ref={setRootElement}
    >
      <Content tabIndex={focused ? undefined : -1}>{children}</Content>

      {!isActive && (
        <Overlay border onClick={handleClick} radius={1} tabIndex={0}>
          <div className={overlayClassName}>
            {!html && <Heading size={1}>{message}</Heading>}
            {html}
          </div>
        </Overlay>
      )}
    </Root>
  )
}
