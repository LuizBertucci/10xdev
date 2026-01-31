// Teste simples para ver se consegue acessar a sessão do Supabase no browser
console.log('Test: Checking if Supabase client can be imported...')

try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  console.log('Env vars loaded:')
  console.log('- NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
  console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅' : '❌')
} catch (err) {
  console.error('Error:', err.message)
}
