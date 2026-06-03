import { supabase } from '../lib/supabase'
import type { VehicleModelFamily } from '../Types/timeStudy'

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export async function getFamilies(): Promise<VehicleModelFamily[]> {
  const { data, error } = await client().from('vehicle_model_families').select('*').eq('is_active', true).order('family_code')
  if (error) throw new Error(error.message)
  return (data ?? []).map(r => ({
    id: r.id, familyCode: r.family_code, nameAr: r.name_ar, nameEn: r.name_en, isActive: r.is_active
  }))
}

export async function getFamilyMembers(familyId: string): Promise<string[]> {
  const { data, error } = await client().from('vehicle_model_family_members').select('vehicle_model_id').eq('family_id', familyId)
  if (error) throw new Error(error.message)
  return (data ?? []).map(r => r.vehicle_model_id as string)
}

export async function setFamilyMembers(familyId: string, modelIds: string[]): Promise<void> {
  const { error: delErr } = await client().from('vehicle_model_family_members').delete().eq('family_id', familyId)
  if (delErr) throw new Error(delErr.message)
  if (modelIds.length === 0) return
  const { error } = await client().from('vehicle_model_family_members').insert(
    modelIds.map(vehicle_model_id => ({ family_id: familyId, vehicle_model_id }))
  )
  if (error) throw new Error(error.message)
}

export async function getTiggo8FamilyId(): Promise<string | null> {
  const { data } = await client().from('vehicle_model_families').select('id').eq('family_code', 'tiggo_8').maybeSingle()
  return data?.id ?? null
}
