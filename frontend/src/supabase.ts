import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://fsooeesaqxaziabkegtq.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzb29lZXNhcXhhemlhYmtlZ3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MDExMjMsImV4cCI6MjA5NzE3NzEyM30.YRBHH-KQj3DMQhFJt-YexN1-v9tyWK5mYEhID3wWjjo'
)
