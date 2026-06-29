import { useCallback } from 'react'
import { useLang } from '../i18n/LanguageContext'
import { errorMessageFromUnknown, formatUserFacingError } from '../Utils/userFacingError'

const KNOWN_CODES: Record<string, string> = {
  IMAGE_TOO_LARGE: 'damagedParts.errImageSize',
  IMAGE_INVALID_TYPE: 'damagedParts.errImageType'
}

/** Map API/DB errors to user-friendly text; permission failures → notPermitted message. */
export function useFormatError() {
  const { t } = useLang()

  return useCallback(
    (error: unknown) => {
      const raw = errorMessageFromUnknown(error, t('common.error'))
      const knownKey = KNOWN_CODES[raw]
      if (knownKey) return t(knownKey)
      return formatUserFacingError(raw, t('common.notPermitted'))
    },
    [t]
  )
}
