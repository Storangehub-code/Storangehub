const webpush = require('web-push')

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY

webpush.setVapidDetails(
  'mailto:cs@responsedx.net',
  VAPID_PUBLIC,
  VAPID_PRIVATE
)

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' }

  const { subscription, title, body, url } = JSON.parse(event.body || '{}')
  if (!subscription) return { statusCode: 400, body: 'No subscription' }

  try {
    await webpush.sendNotification(subscription, JSON.stringify({ title, body, url }))
    return { statusCode: 200, body: JSON.stringify({ ok: true }) }
  } catch (err) {
    console.error(err)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
