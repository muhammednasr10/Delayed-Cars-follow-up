import { describe, expect, it } from 'vitest'
import {
  appendMissionResponseFiles,
  isMissionResponseImage,
  MISSION_RESPONSE_MAX_BYTES,
  missionResponseFileError,
  missionResponseFileExt,
  missionResponseResolvedMime
} from './missionResponseFiles'

function file(name: string, type: string, size = 100) {
  const blob = new Blob([new Uint8Array(size)], { type })
  return new File([blob], name, { type })
}

describe('missionResponseFileExt', () => {
  it('maps mime types to extensions', () => {
    expect(missionResponseFileExt('image/png')).toBe('png')
    expect(missionResponseFileExt('image/jpeg')).toBe('jpg')
    expect(missionResponseFileExt('application/pdf')).toBe('pdf')
  })
})

describe('missionResponseResolvedMime', () => {
  it('infers pdf from the filename when the browser omits a type', () => {
    expect(missionResponseResolvedMime(file('note.pdf', ''))).toBe('application/pdf')
  })
})

describe('isMissionResponseImage', () => {
  it('treats pdf as a document', () => {
    expect(isMissionResponseImage('image/jpeg')).toBe(true)
    expect(isMissionResponseImage('application/pdf')).toBe(false)
  })
})

describe('missionResponseFileError', () => {
  it('accepts images and pdf, and rejects other types and oversized files', () => {
    expect(missionResponseFileError(file('a.pdf', 'application/pdf'))).toBeNull()
    expect(missionResponseFileError(file('a.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'))).toBe(
      'invalid_type'
    )
    expect(missionResponseFileError(file('a.jpg', 'image/jpeg', MISSION_RESPONSE_MAX_BYTES + 1))).toBe('too_large')
    expect(missionResponseFileError(file('a.jpg', 'image/jpeg'))).toBeNull()
  })
})

describe('appendMissionResponseFiles', () => {
  it('caps at three files', () => {
    const a = file('a.jpg', 'image/jpeg')
    const b = file('b.pdf', 'application/pdf')
    const c = file('c.jpg', 'image/jpeg')
    const d = file('d.jpg', 'image/jpeg')
    expect(appendMissionResponseFiles([a, b, c], [d]).error).toBe('too_many')
    expect(appendMissionResponseFiles([a], [b, c]).files).toHaveLength(3)
  })
})
