import { supabase } from './supabase'

const GLOBAL_EMAIL = 'cs@responsedx.net'

export async function notify(userIds, message, type, clinicId = null) {
  if (!userIds || !userIds.length) return
  const rows = userIds.filter(Boolean).map(uid => ({
    user_id: uid,
    message,
    type,
    clinic_id: clinicId,
    read: false,
    created_at: new Date().toISOString()
  }))
  if (rows.length) await supabase.from('notifications').insert(rows)
}

export async function getHigherLevelTargets(clinic, actorRole) {
  // actorRole is the person making the change
  // we notify everyone *below* them who owns this account
  const targets = []
  if (!clinic) return targets

  // Always notify the rep who owns it (if different from actor)
  if (clinic.rep_id) targets.push(clinic.rep_id)

  // Also notify the manager of that rep
  if (clinic.rep_id) {
    const { data: rep } = await supabase.from('profiles').select('manager_id').eq('id', clinic.rep_id).single()
    if (rep?.manager_id) targets.push(rep.manager_id)
  }

  // If the actor is global, also notify managers who might not be the direct manager
  // (already covered above)

  return [...new Set(targets)]
}

export async function sendEmail(to, subject, text) {
  try {
    await fetch('/.netlify/functions/sendemail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, text })
    })
  } catch (e) {
    console.error('Email failed', e)
  }
}

export { GLOBAL_EMAIL }
