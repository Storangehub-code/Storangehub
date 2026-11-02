exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  const { to, subject, text } = JSON.parse(event.body)
  const key = process.env.RESEND_KEY

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
    return { statusCode: 200, body: JSON.stringify(data) }
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) }
  }
}
