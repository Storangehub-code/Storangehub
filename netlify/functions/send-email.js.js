export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const { to, subject, text } = await req.json()
  const key = Netlify.env.get('RESEND_KEY')

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
    return new Response(JSON.stringify(data), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}
