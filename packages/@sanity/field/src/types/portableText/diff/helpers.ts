import {flatten, orderBy} from 'lodash'
import {Block, ObjectField, SchemaType} from '@sanity/types'
import {
  diff_match_patch as DiffMatchPatch,
  DIFF_DELETE,
  DIFF_EQUAL,
  DIFF_INSERT
} from 'diff-match-patch'
import {ArrayDiff, ObjectDiff, StringDiff} from '../../../diff'
import {ObjectSchemaType, ArraySchemaType} from '../../../types'
import {
  ChildMap,
  InlineSymbolMap,
  MarkSymbolMap,
  PortableTextBlock,
  PortableTextDiff,
  PortableTextChild,
  StringSegment,
  SpanTypeSchema
} from './types'

const dmp = new DiffMatchPatch()

export const UNKNOWN_TYPE_NAME = '_UNKOWN_TYPE_'

export function hasPTMemberType(schemaType: ArraySchemaType): boolean {
  return schemaType.of.some(isPTSchemaType)
}
export const MARK_SYMBOLS = [
  // [startTag, endTag]
  ['\uF000', '\uF001'],
  ['\uF002', '\uF003'],
  ['\uF004', '\uF005'],
  ['\uF006', '\uF007'],
  ['\uF008', '\uF009'],
  ['\uF00A', '\uF00B'],
  ['\uF00C', '\uF00D'],
  ['\uF00F', '\uF010'],
  ['\uF011', '\uF012'],
  ['\uF013', '\uF014'],
  ['\uF015', '\uF016'],
  ['\uF017', '\uF018'],
  ['\uF019', '\uF01A'],
  ['\uF01B', '\uF01C'],
  ['\uF01E', '\uF01F'],
  ['\uF020', '\uF021']
]

export const ANNOTATION_SYMBOLS = [
  // [startTag, endTag]
  ['\uF050', '\uF051'],
  ['\uF052', '\uF053'],
  ['\uF054', '\uF055'],
  ['\uF056', '\uF057'],
  ['\uF058', '\uF059'],
  ['\uF05A', '\uF05B'],
  ['\uF05C', '\uF05D'],
  ['\uF05F', '\uF060'],
  ['\uF061', '\uF062'],
  ['\uF063', '\uF064'],
  ['\uF065', '\uF066'],
  ['\uF067', '\uF068'],
  ['\uF069', '\uF06A'],
  ['\uF06B', '\uF06C'],
  ['\uF06E', '\uF06F'],
  ['\uF070', '\uF071']
]

export const INLINE_SYMBOLS = [
  '\uF090',
  '\uF091',
  '\uF092',
  '\uF093',
  '\uF094',
  '\uF095',
  '\uF096',
  '\uF097',
  '\uF098',
  '\uF099',
  '\uF09A',
  '\uF09B',
  '\uF09C',
  '\uF09D',
  '\uF09E',
  '\uF09F'
]

const startMarkSymbols = MARK_SYMBOLS.map(set => set[0]).concat(
  ANNOTATION_SYMBOLS.map(set => set[0])
)
const endMarkSymbols = MARK_SYMBOLS.map(set => set[1]).concat(ANNOTATION_SYMBOLS.map(set => set[1]))
const allSymbols = startMarkSymbols.concat(endMarkSymbols).concat(INLINE_SYMBOLS)
const symbolRegex = new RegExp(`${allSymbols.join('|')}|\n`, 'g')

export function isPTSchemaType(schemaType: SchemaType): schemaType is ObjectSchemaType<Block> {
  return schemaType.jsonType === 'object' && schemaType.name === 'block'
}

export function isHeader(node: PortableTextBlock): boolean {
  return !!node.style && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(node.style)
}

export function createChildMap(origin: ObjectDiff, schemaType: ObjectSchemaType): ChildMap {
  // Create a map from span to diff
  const block = origin.toValue || origin.fromValue
  // Add removed children
  const childMap: ChildMap = {}
  const children = block.children || []
  children.forEach(child => {
    // Fallback type for renderer (unkown types)
    if (typeof child !== 'object' || typeof child._type !== 'string') {
      child._type = UNKNOWN_TYPE_NAME
    }
    const cSchemaType = getChildSchemaType(schemaType.fields, child)
    const cDiff = findChildDiff(origin, child)
    childMap[child._key] = {
      diff: cDiff,
      child,
      schemaType: cSchemaType
    }
  })
  return childMap
}

export function findChildDiff(diff: ObjectDiff, child: PortableTextChild): ObjectDiff {
  const childrenDiff = diff.fields.children as ArrayDiff
  return childrenDiff.items
    .filter(
      item => item.diff.isChanged && (item.diff.toValue === child || item.diff.fromValue === child)
    )
    .map(item => item.diff)
    .map(childDiff => childDiff as ObjectDiff)[0]
}

export function isAddMark(cDiff: ObjectDiff, cSchemaType?: SchemaType): boolean {
  if (!cSchemaType) {
    return false
  }
  return !!(
    cDiff.fields.marks &&
    cDiff.fields.marks.isChanged &&
    cDiff.fields.marks.action === 'added' &&
    Array.isArray(cDiff.fields.marks.toValue) &&
    cDiff.fields.marks.toValue.length > 0 &&
    cSchemaType.jsonType === 'object' &&
    cDiff.fields.marks.toValue.some(
      mark => typeof mark === 'string' && cSchemaType && isDecorator(mark, cSchemaType)
    )
  )
}

export function isRemoveMark(cDiff: ObjectDiff, cSchemaType?: SchemaType): boolean {
  if (!cSchemaType) {
    return false
  }
  return !!(
    cDiff.fields.marks &&
    cDiff.fields.marks.isChanged &&
    cDiff.fields.marks.action === 'removed' &&
    Array.isArray(cDiff.fields.marks.fromValue) &&
    cDiff.fields.marks.fromValue.some(
      mark => typeof mark === 'string' && cSchemaType && isDecorator(mark, cSchemaType)
    )
  )
}

export function getChildSchemaType(
  fields: ObjectField<SchemaType>[],
  child: PortableTextChild
): ObjectSchemaType<Record<string, SchemaType>> | undefined {
  const childrenField = fields.find(f => f.name === 'children')
  const cSchemaType =
    (childrenField &&
      childrenField.type &&
      childrenField.type.jsonType === 'array' &&
      (childrenField.type.of.find(type => type.name === child._type) as ObjectSchemaType)) ||
    undefined
  return cSchemaType
}

export function getDecorators(spanSchemaType: SpanTypeSchema): {title: string; value: string}[] {
  if (spanSchemaType.decorators) {
    return orderBy(spanSchemaType.decorators, ['value'], ['asc'])
  }
  return []
}

export function isDecorator(name: string, schemaType: SpanTypeSchema): boolean {
  return getDecorators(schemaType).some(dec => dec.value === name)
}

export function blockToSymbolizedText(
  block: PortableTextBlock | undefined | null,
  decoratorMap: MarkSymbolMap,
  annotationMap: MarkSymbolMap,
  inlineMap: InlineSymbolMap
): string {
  if (!block) {
    return ''
  }
  return block.children
    .map(child => {
      let returned = child.text || ''
      if (child._type !== 'span') {
        returned = inlineMap[child._key]
      } else if (child.marks) {
        child.marks.forEach(mark => {
          const _isDecorator = !!decoratorMap[mark]
          if (_isDecorator) {
            returned = `${decoratorMap[mark][0]}${returned}${decoratorMap[mark][1]}`
          } else if (annotationMap[mark]) {
            returned = `${annotationMap[mark][0]}${returned}${annotationMap[mark][1]}`
          }
        })
      }
      return returned
    })
    .join('')
}

export function createPortableTextDiff(
  diff: ObjectDiff,
  schemaType: ObjectSchemaType
): PortableTextDiff {
  const displayValue =
    diff.action === 'removed'
      ? (diff.fromValue as PortableTextBlock)
      : (diff.toValue as PortableTextBlock)
  const _diff: PortableTextDiff = {
    ...diff,
    origin: diff,
    displayValue
  }

  if (displayValue) {
    const annotationMap: MarkSymbolMap = {}
    const markMap: MarkSymbolMap = {}
    const inlineMap: InlineSymbolMap = {}
    const spanSchemaType = getChildSchemaType(schemaType.fields, {_key: 'bogus', _type: 'span'})
    if (spanSchemaType) {
      getDecorators(spanSchemaType).forEach((dec, index) => {
        markMap[dec.value] = MARK_SYMBOLS[index]
      })
    }
    const markDefs = displayValue.markDefs || []
    markDefs.forEach((markDef, index) => {
      annotationMap[markDef._key] = ANNOTATION_SYMBOLS[index]
    })
    const inlines = getInlineObjects(displayValue as PortableTextBlock)
    inlines.forEach((nonSpan, index) => {
      inlineMap[nonSpan._key] = INLINE_SYMBOLS[index]
    })
    const fromText = blockToSymbolizedText(
      _diff.fromValue as PortableTextBlock,
      markMap,
      annotationMap,
      inlineMap
    )
    const toText = blockToSymbolizedText(
      _diff.toValue as PortableTextBlock,
      markMap,
      annotationMap,
      inlineMap
    )
    const toPseudoValue = {
      ...displayValue,
      children: [
        {
          _type: 'span',
          _key: 'pseudoSpanKey',
          text: toText,
          marks: []
        }
      ]
    }
    const fromPseudoValue = {
      displayValue,
      children: [
        {
          _type: 'span',
          _key: 'pseudoSpanKey',
          text: fromText,
          marks: []
        }
      ]
    }
    const pseudoDiff = {
      origin: diff,
      action: 'changed',
      type: 'object',
      displayValue: toPseudoValue,
      fromValue: fromPseudoValue,
      toValue: toPseudoValue,
      isChanged: true,
      fields: {
        children: {
          action: 'changed',
          type: 'array',
          isChanged: true,
          items: [
            {
              diff: {
                action: 'changed',
                type: 'object',
                isChanged: true,
                fields: {
                  text: {
                    type: 'string',
                    action: 'changed',
                    isChanged: true,
                    fromValue: fromText,
                    toValue: toText,
                    segments: buildSegments(fromText, toText).map(seg => ({
                      ...seg,
                      ...(_diff.action !== 'unchanged' && _diff.annotation
                        ? {annotation: _diff.annotation} // Fallback if we can't find a spesific original diff
                        : {})
                    }))
                  }
                },
                fromValue: fromPseudoValue.children[0],
                toValue: toPseudoValue.children[0]
              },
              annotation: null,
              fromIndex: 0,
              toIndex: 0,
              hasMoved: false
            }
          ],
          fromValue: fromPseudoValue.children,
          toValue: toPseudoValue.children
        }
      }
    }
    return pseudoDiff as PortableTextDiff
  }
  throw new Error('Can not display this diff')
}

function buildSegments(fromInput: string, toInput: string): StringSegment[] {
  const segments: StringSegment[] = []

  const dmpDiffs = dmp.diff_main(fromInput, toInput)
  dmp.diff_cleanupEfficiency(dmpDiffs)

  let fromIdx = 0
  let toIdx = 0

  for (const [op, text] of dmpDiffs) {
    switch (op) {
      case DIFF_EQUAL:
        segments.push({
          type: 'stringSegment',
          action: 'unchanged',
          text
        })
        fromIdx += text.length
        toIdx += text.length
        break
      case DIFF_DELETE:
        segments.push({
          type: 'stringSegment',
          action: 'removed',
          text: fromInput.substring(fromIdx, fromIdx + text.length)
        })
        fromIdx += text.length
        break
      case DIFF_INSERT:
        segments.push({
          type: 'stringSegment',
          action: 'added',
          text: toInput.substring(toIdx, toIdx + text.length)
        })
        toIdx += text.length
        break
      default:
      // Do nothing
    }
  }
  // Clean up so that marks / symbols are treated as an own segment
  return flatten(
    segments.map(seg => {
      const newSegments: StringSegment[] = []
      if (seg.text.length > 1) {
        const markMatches = [...seg.text.matchAll(symbolRegex)]
        let lastIndex = -1
        markMatches.forEach(match => {
          const index = match.index || 0
          if (index > lastIndex) {
            newSegments.push({...seg, text: seg.text.substring(lastIndex + 1, index)})
            newSegments.push({...seg, text: match[0]})
          }
          if (match === markMatches[markMatches.length - 1]) {
            newSegments.push({...seg, text: seg.text.substring(index + 1)})
          }
          lastIndex = index
        })
        if (markMatches.length === 0) {
          newSegments.push(seg)
        }
      } else {
        newSegments.push(seg)
      }
      return newSegments
    })
  ).filter(seg => seg.text)
}

export function getInlineObjects(block: PortableTextBlock): PortableTextChild[] {
  if (!block.children) {
    return []
  }
  const nonSpans = orderBy(
    block.children.filter(chld => chld._type !== 'span'),
    ['_key'],
    ['asc']
  )
  return nonSpans
}

export function findMarksDiff(
  diff: ObjectDiff,
  mark: string,
  text: string
): StringDiff | undefined {
  const spanDiff =
    diff.fields.children &&
    diff.fields.children.action === 'changed' &&
    diff.fields.children.type === 'array' &&
    (diff.fields.children.items.find(
      // TODO: could this be done better? We cant exact match on string as they may be broken apart.
      // Check for indexOf string for now
      item =>
        item.diff &&
        item.diff.type === 'object' &&
        item.diff.fields.marks &&
        item.diff.fields.marks.type === 'array' &&
        item.diff.fields.text &&
        item.diff.fields.text.type === 'string' &&
        ((item.diff.fields.text.toValue && item.diff.fields.text.toValue.indexOf(text) > -1) ||
          (item.diff.fields.text.fromValue &&
            item.diff.fields.text.fromValue.indexOf(text) > -1)) &&
        ((Array.isArray(item.diff.fields.marks.toValue) &&
          item.diff.fields.marks.toValue.includes(mark)) ||
          (Array.isArray(item.diff.fields.marks.fromValue) &&
            item.diff.fields.marks.fromValue.includes(mark)))
    )?.diff as ObjectDiff)
  const marksDiff =
    spanDiff &&
    spanDiff.fields.marks &&
    spanDiff.fields.marks.type === 'array' &&
    spanDiff.fields.marks.action !== 'unchanged' &&
    spanDiff.fields.marks.items.find(
      item => item.diff.toValue === mark || item.diff.fromValue === mark
    )?.diff
  return marksDiff && marksDiff.type === 'string' ? marksDiff : undefined
}
