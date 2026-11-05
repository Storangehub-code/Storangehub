export default async (event) => {
  console.log('Function called')
  console.log('Method:', event.httpMethod)
  console.log('Body:', event.body)
  
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  const { to, subject, text } = JSON.parse(event.body || '{}')
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
    return { statusCode: 200, body: JSON.stringify(data) }
  } catch (e) {
    console.log('Error:', e.message)
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) }
  }
}
