import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

const VAPID_PUBLIC = 'BBeGdxJHpkW03zcrHQrDW4beU5mUb81cIDxmzOuUMHhwMVov-QJCFclmxR3BjzOwKEaNh_nJ7u17Sk-6Qxo2Nfk'

export default function PushRegister({ userId }) {
  useEffect(() => {
    if (!userId || !('serviceWorker' in navigator) || !('PushManager' in window)) return
    register()
  }, [userId])

  async function register() {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC)
      })

      const json = sub.toJSON()
      await supabase.from('push_subscriptions').upsert({
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth
      }, { onConflict: 'endpoint' })
    } catch (e) {
      console.error('Push register failed', e)
    }
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const raw = window.atob(base64)
    const output = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i)
    return output
  }

  return null
}
