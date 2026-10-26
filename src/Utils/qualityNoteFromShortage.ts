import type { MissingPartDetail } from '../Types/missingPart'
import type { Station, VehicleModel } from '../Types/settings'
import type { QualityNoteFormState } from '../Components/quality/qualityNoteFormState'
import { uniqueIssueReps } from './missingPartPageUtils'
import { formatStationReferenceCode, normalizeStationReferenceCode } from './stationHierarchy'

export function qualityNoteDraftFromShortage(
  parts: MissingPartDetail[],
  models: VehicleModel[],
  stations: Station[],
  category = ''
): { form: QualityNoteFormState; stationQuery: string } {
  const issues = uniqueIssueReps(parts)
  const vins = [...new Set(parts.map(part => part.vin.trim().toUpperCase()).filter(Boolean))]
  const modelNames = new Set(parts.map(part => part.modelName.trim().toUpperCase()).filter(Boolean))
  const vehicleModelIds = models.filter(model => modelNames.has(model.name.trim().toUpperCase())).map(model => model.id)
  const linkedStationId = parts.find(part => part.stationId)?.stationId ?? ''
  const stationCode = parts.find(part => part.stationNumber)?.stationNumber ?? ''
  const matchedStation =
    stations.find(station => station.id === linkedStationId) ??
    stations.find(
      station =>
        stationCode &&
        normalizeStationReferenceCode(station.station_number) === normalizeStationReferenceCode(stationCode)
    )
  const form: QualityNoteFormState = {
    vehicleModelIds,
    stationId: matchedStation?.id ?? linkedStationId,
    workerLineStationId: '',
    category,
    severity: 'recurring',
    repairTime: 'medium',
    notedAt: new Date().toISOString().slice(0, 10),
    description: issues.map(part => part.partDescription.trim()).filter(Boolean).join('\n'),
    specifyVins: vins.length > 0,
    vins: vins.length > 0 ? vins : ['']
  }
  return {
    form,
    stationQuery: matchedStation
      ? formatStationReferenceCode(matchedStation.station_number)
      : stationCode
        ? formatStationReferenceCode(stationCode)
        : ''
  }
}
