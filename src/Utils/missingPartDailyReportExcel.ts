export type CausingSummaryLine = {
  vehicleId: string
  modelName: string
  department: string
}

export type CausingDepartmentTotal = {
  department: string
  vehicles: number
  lines: number
}

export type CausingModelTotal = {
  model: string
  department: string
  vehicles: number
  lines: number
}

type Bucket = { vehicles: Set<string>; lines: number }

function bump(bucket: Bucket, vehicleId: string) {
  bucket.vehicles.add(vehicleId)
  bucket.lines += 1
}

export function summarizeCausingDepartments(lines: CausingSummaryLine[]): {
  byDepartment: CausingDepartmentTotal[]
  byModel: CausingModelTotal[]
} {
  const byDepartment = new Map<string, Bucket>()
  const byModel = new Map<string, Bucket & { model: string; department: string }>()

  for (const line of lines) {
    const department = line.department.trim() || '—'
    const model = line.modelName.trim() || '—'
    const deptBucket = byDepartment.get(department) ?? { vehicles: new Set<string>(), lines: 0 }
    bump(deptBucket, line.vehicleId)
    byDepartment.set(department, deptBucket)

    const modelKey = `${model}\u0000${department}`
    const modelBucket = byModel.get(modelKey) ?? { vehicles: new Set<string>(), lines: 0, model, department }
    bump(modelBucket, line.vehicleId)
    byModel.set(modelKey, modelBucket)
  }

  const byCount = (a: { vehicles: number; lines: number }, b: { vehicles: number; lines: number }, labelA: string, labelB: string) =>
    b.vehicles - a.vehicles || b.lines - a.lines || labelA.localeCompare(labelB, 'ar')

  return {
    byDepartment: [...byDepartment.entries()]
      .map(([department, bucket]) => ({ department, vehicles: bucket.vehicles.size, lines: bucket.lines }))
      .sort((a, b) => byCount(a, b, a.department, b.department)),
    byModel: [...byModel.values()]
      .map(bucket => ({
        model: bucket.model,
        department: bucket.department,
        vehicles: bucket.vehicles.size,
        lines: bucket.lines
      }))
      .sort((a, b) => byCount(a, b, `${a.model}${a.department}`, `${b.model}${b.department}`))
  }
}
