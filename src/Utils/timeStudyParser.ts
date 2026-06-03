import type { ParsedHardware, ParsedOperation, ParsedStation, ParseResult } from '../Types/timeStudy'

/** Column indices from the T8 time study sheet export */
const COL = {
  station: 0,
  stationAlt: 1,
  toolSpec: 2,
  toolPct: 3,
  opLine: 4,
  operation: 5,
  classification: 6,
  hwQty: 7,
  hwName: 8,
  hwType: 9,
  hwSize: 10,
  techPos: 12,
  precedence: 13,
  rankedWeight: 14,
  zoning: 15,
  sec: 16,
  min: 17,
  mmss: 18,
  workerMin: 19,
  stationMin: 20,
  workers: 21,
  avgWorker: 22
} as const

function cell(row: string[], i: number): string {
  return (row[i] ?? '').trim()
}

export function normalizeStationCode(raw: string): string {
  return raw
    .trim()
    .replace(/^St\./i, 'ST')
    .replace(/\s+/g, '')
    .toUpperCase()
}

function parseNum(v: string): number | null {
  if (!v) return null
  const n = Number(v.replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

/** Parse mm:ss or H:MM (authoritative per business rule) → minutes */
export function parseMmSsToMinutes(v: string): number | null {
  const s = v.trim()
  if (!s) return null
  const parts = s.split(':').map(p => p.trim())
  if (parts.length === 2) {
    const m = Number(parts[0])
    const sec = Number(parts[1])
    if (Number.isFinite(m) && Number.isFinite(sec)) return m + sec / 60
  }
  if (parts.length === 3) {
    const h = Number(parts[0])
    const m = Number(parts[1])
    const sec = Number(parts[2])
    if (Number.isFinite(h) && Number.isFinite(m) && Number.isFinite(sec)) return h * 60 + m + sec / 60
  }
  return parseNum(s)
}

function inferStationType(code: string): string {
  if (/^PBS/i.test(code)) return 'pbs'
  if (/^ST/i.test(code)) return 'main_line'
  return 'other'
}

function parentFromLine(code: string): { parent: string | null; line: string | null } {
  const m = code.match(/^(.+)-(L\d+)$/i)
  if (!m) return { parent: null, line: null }
  return { parent: normalizeStationCode(m[1]), line: m[2].toUpperCase() }
}

function isGroupHeaderRow(row: string[]): boolean {
  const op = cell(row, COL.operation)
  const c0 = cell(row, COL.station)
  const c5 = op
  const group = normalizeStationCode(c5 || c0)
  return Boolean(group && !c0.includes('-') && /^PBS\d+$|^ST\d+$/i.test(group) && !cell(row, COL.hwName))
}

function isOperationRow(row: string[]): boolean {
  return Boolean(cell(row, COL.operation)) && !isGroupHeaderRow(row)
}

function slugCode(station: string, seq: number): string {
  return `${station}-${String(seq).padStart(3, '0')}`
}

export function parseTimeStudyRows(rows: string[][]): ParseResult {
  const errors: ParseResult['errors'] = []
  const warnings: ParseResult['warnings'] = []
  const stations = new Map<string, ParsedStation>()
  const opMap = new Map<string, ParsedOperation>()
  let currentStation = ''
  let currentParent: string | null = null
  let currentTechPos: string | null = null
  let seq = 0

  const dataStart = rows.findIndex((r, i) => i > 0 && (isOperationRow(r) || isGroupHeaderRow(r)))
  const dataRows = dataStart >= 0 ? rows.slice(dataStart) : rows

  dataRows.forEach((row, idx) => {
    const rowNum = dataStart >= 0 ? dataStart + idx + 1 : idx + 1
    const s0 = cell(row, COL.station)
    const s1 = cell(row, COL.stationAlt)
    const stationRaw = s0 || s1

    if (stationRaw) {
      currentStation = normalizeStationCode(stationRaw)
      const { parent, line } = parentFromLine(currentStation)
      currentParent = parent
      if (!stations.has(currentStation)) {
        stations.set(currentStation, {
          code: currentStation,
          parentCode: parent,
          name: currentStation,
          stationType: inferStationType(currentStation),
          lineName: line,
          sortOrder: stations.size,
          technicianPosition: null,
          isGroupHeader: false
        })
      }
      if (parent && !stations.has(parent)) {
        stations.set(parent, {
          code: parent,
          parentCode: null,
          name: parent,
          stationType: inferStationType(parent),
          lineName: null,
          sortOrder: stations.size,
          technicianPosition: currentTechPos,
          isGroupHeader: true
        })
      }
    }

    if (isGroupHeaderRow(row)) {
      const g = normalizeStationCode(cell(row, COL.operation) || cell(row, COL.station))
      const groupName = cell(row, COL.stationAlt) || cell(row, COL.station) || g
      currentParent = g
      currentTechPos = cell(row, COL.techPos) || null
      if (!stations.has(g)) {
        stations.set(g, {
          code: g,
          parentCode: null,
          name: groupName !== g ? groupName : g,
          stationType: inferStationType(g),
          lineName: null,
          sortOrder: stations.size,
          technicianPosition: currentTechPos,
          isGroupHeader: true
        })
      } else {
        const st = stations.get(g)!
        st.technicianPosition = currentTechPos
        st.isGroupHeader = true
        if (groupName !== g) st.name = groupName
      }
      return
    }

    if (!isOperationRow(row)) return
    if (!currentStation) {
      errors.push({ row: rowNum, message: 'Operation without station code' })
      return
    }

    const opName = cell(row, COL.operation)
    const key = `${currentStation}::${opName}`
    const mmss = cell(row, COL.mmss)
    const minutesFromMmss = parseMmSsToMinutes(mmss)

    if (!minutesFromMmss && mmss) {
      warnings.push({ row: rowNum, message: `Could not parse time: ${mmss}` })
    }

    const hw: ParsedHardware = {
      hardwareName: cell(row, COL.hwName),
      hardwareQty: parseNum(cell(row, COL.hwQty)),
      hardwareType: cell(row, COL.hwType) || null,
      hardwareSize: cell(row, COL.hwSize) || null
    }

    if (!opMap.has(key)) {
      seq += 1
      const classification = cell(row, COL.classification) || 'common'
      opMap.set(key, {
        rowNumbers: [rowNum],
        stationCode: currentStation,
        parentStationCode: currentParent,
        operationNameAr: opName,
        operationType: classification.toLowerCase(),
        toolSpec: cell(row, COL.toolSpec) || null,
        toolSpecPercent: cell(row, COL.toolPct) || null,
        technicianPosition: cell(row, COL.techPos) || currentTechPos,
        taskPrecedence: cell(row, COL.precedence) || null,
        rankedPositionalWeight: parseNum(cell(row, COL.rankedWeight)),
        zoningConstraints: cell(row, COL.zoning) || null,
        standardTimeSeconds: parseNum(cell(row, COL.sec)),
        standardTimeMinutes: minutesFromMmss ?? parseNum(cell(row, COL.min)),
        workerTimeMinutes: parseMmSsToMinutes(cell(row, COL.workerMin)) ?? parseNum(cell(row, COL.workerMin)),
        stationTimeMinutes: parseMmSsToMinutes(cell(row, COL.stationMin)) ?? parseNum(cell(row, COL.stationMin)),
        requiredManpowerCount: parseNum(cell(row, COL.workers)),
        averageStationTimePerWorker: parseMmSsToMinutes(cell(row, COL.avgWorker)) ?? parseNum(cell(row, COL.avgWorker)),
        sequenceNo: seq,
        hardware: hw.hardwareName ? [hw] : [],
        vehicleModelName: classification.toLowerCase() === 'common' ? null : classification,
        isStationHeaderOnly: false
      })
    } else {
      const op = opMap.get(key)!
      op.rowNumbers.push(rowNum)
      if (hw.hardwareName) op.hardware.push(hw)
      if (minutesFromMmss != null) op.standardTimeMinutes = minutesFromMmss
      if (parseNum(cell(row, COL.workers)) != null) op.requiredManpowerCount = parseNum(cell(row, COL.workers))
    }
  })

  return {
    stations: [...stations.values()],
    operations: [...opMap.values()],
    errors,
    warnings
  }
}

export function operationCodeFor(stationCode: string, sequenceNo: number, nameAr: string): string {
  const base = slugCode(stationCode, sequenceNo)
  const hash = nameAr.length % 97
  return `${base}-${hash}`
}
