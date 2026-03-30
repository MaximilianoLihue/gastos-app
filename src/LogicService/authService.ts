import { createClient } from '@/lib/supabase/server'

export async function loginWithPassword(email: string, password: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    const message = error.message.includes('Invalid login credentials')
      ? 'Email o contraseña incorrectos'
      : error.message
    return { error: message }
  }

  return {}
}
