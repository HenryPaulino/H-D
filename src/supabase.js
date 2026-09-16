import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const cloudEnabled = Boolean(supabaseUrl && supabaseAnonKey)
export const supabase = cloudEnabled ? createClient(supabaseUrl, supabaseAnonKey) : null

const memoriesTable = 'memories'
const entriesTable = 'shared_entries'
const settingsTable = 'shared_settings'
const photosBucket = 'memory-photos'

const mapMemory = (row) => ({
  id: row.id,
  title: row.title,
  date: row.date || '',
  text: row.text || '',
  image: row.image_url,
  storagePath: row.storage_path || '',
})

export const listCloudMemories = async () => {
  if (!supabase) return { data: null, error: null }

  const { data, error } = await supabase
    .from(memoriesTable)
    .select('*')
    .order('created_at', { ascending: false })

  return { data: error ? null : data.map(mapMemory), error }
}

export const createCloudMemory = async ({ title, date, text, file }) => {
  if (!supabase) return { data: null, error: null }

  const storagePath = `${crypto.randomUUID()}-${file.name}`
  const { error: uploadError } = await supabase.storage
    .from(photosBucket)
    .upload(storagePath, file, { contentType: file.type, upsert: false })

  if (uploadError) return { data: null, error: uploadError }

  const { data: publicUrl } = supabase.storage.from(photosBucket).getPublicUrl(storagePath)
  const { data, error } = await supabase
    .from(memoriesTable)
    .insert({ title, date: date || null, text: text || '', image_url: publicUrl.publicUrl, storage_path: storagePath })
    .select()
    .single()

  if (error) {
    await supabase.storage.from(photosBucket).remove([storagePath])
    return { data: null, error }
  }

  return { data: mapMemory(data), error: null }
}

export const deleteCloudMemory = async (memory) => {
  if (!supabase || !memory.id) return { error: null }

  const { error } = await supabase.from(memoriesTable).delete().eq('id', memory.id)
  if (error) return { error }
  if (memory.storagePath) await supabase.storage.from(photosBucket).remove([memory.storagePath])
  return { error: null }
}

const mapEntry = (row) => ({
  id: row.id,
  title: row.title,
  date: row.date || '',
  text: row.text || '',
})

export const listCloudEntries = async (type) => {
  if (!supabase) return { data: null, error: null }

  const { data, error } = await supabase
    .from(entriesTable)
    .select('*')
    .eq('type', type)
    .order('created_at', { ascending: false })

  return { data: error ? null : data.map(mapEntry), error }
}

export const createCloudEntry = async ({ type, title, date, text }) => {
  if (!supabase) return { data: null, error: null }

  const { data, error } = await supabase
    .from(entriesTable)
    .insert({ type, title, date: date || null, text: text || '' })
    .select()
    .single()

  return { data: error ? null : mapEntry(data), error }
}

export const deleteCloudEntry = async (entry) => {
  if (!supabase || !entry.id) return { error: null }
  const { error } = await supabase.from(entriesTable).delete().eq('id', entry.id)
  return { error }
}

export const getSharedMeetingDate = async () => {
  if (!supabase) return { data: null, error: null }

  const { data, error } = await supabase
    .from(settingsTable)
    .select('value')
    .eq('key', 'next_meeting')
    .maybeSingle()

  return { data: data?.value || '', error }
}

export const setSharedMeetingDate = async (date) => {
  if (!supabase) return { error: null }

  const { error } = await supabase
    .from(settingsTable)
    .upsert({ key: 'next_meeting', value: date }, { onConflict: 'key' })

  return { error }
}

export const subscribeToCloudChanges = (onChange) => {
  if (!supabase) return null

  return supabase
    .channel('shared-album-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: memoriesTable }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: entriesTable }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: settingsTable }, onChange)
    .subscribe()
}
