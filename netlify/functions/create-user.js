export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let body = {}
  try {
    body = JSON.parse(await req.text() || '{}')
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }

  const { email, full_name, phone, home_address, role, manager_id } = body
  if (!email || !full_name || !role) {
    return new Response(JSON.stringify({ error: 'email, full_name, and role are required' }), { status: 400 })
  }

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return new Response(JSON.stringify({ error: 'Missing Supabase service config' }), { status: 500 })
  }

  const createRes = await fetch(url + '/auth/v1/admin/users', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + key,
      'apikey': key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      email_confirm: true,
      user_metadata: { full_name }
    })
  })

  const createData = await createRes.json()
  if (!createRes.ok) {
    return new Response(JSON.stringify({ error: createData.msg || createData.error || 'Failed to create user' }), { status: createRes.status })
  }

  const userId = createData.id

  const profileRes = await fetch(url + '/rest/v1/profiles', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + key,
      'apikey': key,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      id: userId,
      full_name,
      email,
      phone: phone || null,
      home_address: home_address || null,
      role,
      manager_id: manager_id || null
    })
  })

  if (!profileRes.ok) {
    const err = await profileRes.text()
    return new Response(JSON.stringify({ error: 'User created but profile insert failed: ' + err }), { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true, id: userId }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}