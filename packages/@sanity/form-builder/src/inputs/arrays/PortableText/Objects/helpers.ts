import {isKeySegment} from '@sanity/types'
import {PortableTextChild, Type} from '@sanity/portable-text-editor'

export function findObjectAndType(
  objectEditData,
  value,
  ptFeatures
): [PortableTextChild | undefined, Type | undefined] {
  if (!objectEditData) {
    return [undefined, undefined]
  }

  const {editorPath, formBuilderPath, kind} = objectEditData

  let object: PortableTextChild
  let type: Type

  // Try finding the relevant block
  const blockKey =
    Array.isArray(formBuilderPath) && isKeySegment(formBuilderPath[0]) && formBuilderPath[0]._key

  const block =
    value && blockKey && Array.isArray(value) && value.find((blk) => blk._key === blockKey)

  const child =
    block &&
    block.children &&
    block.children.find((cld) => isKeySegment(editorPath[2]) && cld._key === editorPath[2]._key)

  if (block) {
    // Get object, type, and relevant editor element
    switch (kind) {
      case 'blockObject':
        object = block
        type = ptFeatures.types.blockObjects.find((t) => t.name === block._type)
        break

      case 'inlineObject':
        object = child
        // eslint-disable-next-line max-depth
        if (object) {
          type = ptFeatures.types.inlineObjects.find((t) => t.name === child._type)
        }
        break

      case 'annotation':
        // eslint-disable-next-line max-depth
        if (child) {
          const markDef =
            child.marks &&
            block.markDefs &&
            block.markDefs.find((def) => child.marks.includes(def._key))
          // eslint-disable-next-line max-depth
          if (markDef) {
            type = ptFeatures.types.annotations.find((t) => t.name === markDef._type)
            object = markDef
          }
        }
        break

      default:
      // Nothing
    }
  }

  return [object, type]
}
