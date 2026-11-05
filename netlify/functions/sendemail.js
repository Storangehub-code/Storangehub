export default async (req) => {
  console.log('Function called')
  console.log('Method:', req.method)
  
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let body = {}
  try {
    const text = await req.text()
    console.log('Body:', text)
    body = JSON.parse(text || '{}')
  } catch (e) {
    console.log('Parse error:', e.message)
  }

  const { to, subject, text } = body
  const key = process.env.RESEND_KEY
  console.log('Key exists:', !!key)
  console.log('To:', to)

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Response DX <onboarding@resend.dev>',
        to,
        subject,
        text
      })
    })
    const data = await res.json()
    console.log('Resend response:', JSON.stringify(data))
    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    console.log('Error:', e.message)
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
