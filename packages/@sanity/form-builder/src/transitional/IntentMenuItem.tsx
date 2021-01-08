import {MenuItem} from '@sanity/ui'
import {useRouter} from 'part:@sanity/base/router'
import React from 'react'

export function IntentMenuItem(props: any) {
  const router = useRouter()

  return <MenuItem {...props} as="a" href={router.resolveIntentLink(props.intent, props.params)} />
}
