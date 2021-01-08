import {InvalidValueResolution, PortableTextBlock} from '@sanity/portable-text-editor'
import {Button} from '@sanity/ui'
import React from 'react'
import Warning from '../../Warning'

interface InvalidValueProps {
  resolution: InvalidValueResolution
  value: PortableTextBlock[]
  onChange: (...args: any[]) => any
  onIgnore: () => void
}

export class InvalidValue extends React.PureComponent<InvalidValueProps> {
  handleAction = (): void => {
    const resolution = this.props.resolution
    if (resolution) {
      const {patches} = resolution
      this.props.onChange({type: 'mutation', patches})
    }
  }

  handleIgnore = (): void => {
    this.props.onIgnore()
  }

  render() {
    const {resolution} = this.props
    const message = (
      <>
        <p>{resolution.description}</p>
        <p>
          <pre>{JSON.stringify(resolution.item, null, 2)}</pre>
        </p>
        {resolution.action && (
          <>
            <div>
              <Button tone="primary" onClick={this.handleAction} text={resolution.action} />
              <Button mode="ghost" onClick={this.handleIgnore} text="Ignore" />
            </div>
            <p>
              It’s generally safe to perform the action above, but if you are in doubt, get in touch
              with those responsible for configuring your studio.
            </p>
          </>
        )}
      </>
    )

    return <Warning heading="Invalid portable text value" message={message} />
  }
}
