import { createClient } from '@supabase/supabase-js'

// Lazy initialization to prevent build-time errors
let _supabase: ReturnType<typeof createClient> | null = null

export function getSupabase() {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables')
    }
    
    _supabase = createClient(supabaseUrl, supabaseAnonKey)
  }
  
  return _supabase
}

// Backward compatibility exports
export const supabase = new Proxy({} as any, {
  get(target, prop) {
    return getSupabase()[prop as keyof ReturnType<typeof createClient>]
  }
})

export default supabase