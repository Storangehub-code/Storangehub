// netlify/functions/poll-accessions.js
// Scheduled function that checks Zoho inbox for Daily Accessioning Reports
// and upserts them into the tests table.

import { createClient } from '@supabase/supabase-js'
import { ImapFlow } from 'imapflow'
import * as cheerio from 'cheerio'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

const ZOHO_HOST = process.env.ZOHO_IMAP_HOST || 'imap.zoho.com'
const ZOHO_USER = process.env.ZOHO_EMAIL          // from env
const ZOHO_PASS = process.env.ZOHO_APP_PASSWORD   // from env

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

function parseDate(str) {
  if (!str) return null
  const s = String(str).trim()
  // Handles 11/4/2026, 11/20/2026, etc.
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) {
    const [, mon, day, year] = m
    return `${year}-${mon.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  return null
}

function normalizeName(raw) {
  if (!raw) return ''
  const s = String(raw).trim()
  const parts = s.split(',').map(p => p.trim())
  if (parts.length >= 2) {
    // "Kidd MD,Robert" → last=Kidd, first=Robert
    const last = parts[0].replace(/\s+(MD|DO|NP|PA|FNP|APRN|DPM)\.?$/i, '').trim()
    const first = parts[parts.length - 1]
    return `${last}, ${first}`.toLowerCase()
  }
  return s.toLowerCase()
}

async function loadLookups() {
  const { data: clinics } = await supabase.from('clinics').select('id, name, clinic_code')
  const { data: providers } = await supabase.from('providers').select('id, first_name, last_name, title, npi')

  const clinicByCode = {}
  ;(clinics || []).forEach(c => {
    if (c.clinic_code) clinicByCode[String(c.clinic_code).trim().toUpperCase()] = c
  })

  const providerByName = {}
  ;(providers || []).forEach(p => {
    const last = (p.last_name || '').trim()
    const first = (p.first_name || '').trim()
    if (last && first) {
      providerByName[`${last}, ${first}`.toLowerCase()] = p
      providerByName[`${first} ${last}`.toLowerCase()] = p
    }
  })

  return { clinicByCode, providerByName }
}

function parseTable(html) {
  const $ = cheerio.load(html)
  const rows = []

  $('table tr').each((i, tr) => {
    const cells = $(tr).find('td, th').map((_, el) => $(el).text().trim()).get()
    if (cells.length < 8) return
    // Skip header-like rows
    if (cells[0].toLowerCase().includes('order') || cells[0] === '') return

    const [orderNumber, clinicName, clinicCode, providerName, collectionDate, receivedDate, releasedDate, testOrdered, payer] = cells

    if (!orderNumber || !clinicCode) return

    rows.push({
      accession: orderNumber.trim(),
      clinic_name: clinicName.trim(),
      clinic_code: clinicCode.trim().toUpperCase(),
      provider_raw: providerName.trim(),
      collected: parseDate(collectionDate),
      received: parseDate(receivedDate),
      released: parseDate(releasedDate),
      test_type: testOrdered.trim(),
      payer: (payer || '').trim()
    })
  })

  return rows
}

export default async (req) => {
  if (!ZOHO_USER || !ZOHO_PASS) {
    return new Response(JSON.stringify({ error: 'Zoho credentials not configured' }), { status: 500 })
  }

  const client = new ImapFlow({
    host: ZOHO_HOST,
    port: 993,
    secure: true,
    auth: { user: ZOHO_USER, pass: ZOHO_PASS }
  })

  let processed = 0
  let inserted = 0
  let updated = 0
  const errors = []

  try {
    await client.connect()
    const lock = await client.getMailboxLock('INBOX')

    try {
      // Find unread messages that look like accession reports
      const messages = await client.search({ since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) })  // last 7 days
      console.log(`Found ${messages.length} recent messages`)

      const { clinicByCode, providerByName } = await loadLookups()

      for (const uid of messages.slice(0, 20)) { // process up to 20 at a time
        const msg = await client.fetchOne(uid, { source: true, envelope: true })
        const source = msg.source.toString()

        // Simple check for the report
        if (!source.toLowerCase().includes('daily accessioning report') &&
            !(msg.envelope?.subject || '').toLowerCase().includes('accession')) {
          continue
        }

        const rows = parseTable(source)
        // Clean trailing = from accession numbers
        rows.forEach(r => { if (r.accession) r.accession = r.accession.replace(/=+$/, '') })
        console.log(`Email UID ${uid}: parsed ${rows.length} rows`)

        for (const row of rows) {
          const clinic = clinicByCode[row.clinic_code]
          if (!clinic) {
            const msg = `No clinic match for code ${row.clinic_code} (${row.clinic_name})`
            console.log(msg)
            errors.push(msg)
            continue
          }
          console.log(`Matched clinic: ${clinic.name} (${row.clinic_code})`)

          const providerKey = normalizeName(row.provider_raw)
          const provider = providerByName[providerKey] || null
          if (provider) console.log(`Matched provider: ${provider.last_name}, ${provider.first_name}`)
          else console.log(`No provider match for: ${row.provider_raw}`)

          const record = {
            accession: row.accession,
            collected: row.collected,
            collected_at: row.collected,
            finalized: row.released,
            finalized_at: row.released,
            test_type: row.test_type,
            clinic_id: clinic.id,
            provider_id: provider?.id || null,
            status: row.released ? 'resulted' : 'received'
          }

          const { error } = await supabase.from('tests').upsert(record, { onConflict: 'accession' })
          if (error) {
            const msg = `Upsert failed for ${row.accession}: ${error.message}`
            console.log(msg)
            errors.push(msg)
          } else {
            console.log(`Upserted ${row.accession} (${row.test_type})`)
            if (row.released) updated++
            else inserted++
          }
        }

        // Mark as seen
        await client.messageFlagsAdd(uid, ['\\Seen'])
        processed++
      }
    } finally {
      lock.release()
    }

    await client.logout()
  } catch (e) {
    console.error('Poller error:', e)
    return new Response(JSON.stringify({ error: e.message, processed, inserted, updated, errors }), { status: 500 })
  }

  console.log(`Done. Processed: ${processed}, Inserted: ${inserted}, Updated: ${updated}, Errors: ${errors.length}`)
  if (errors.length) console.log('Errors:', errors.slice(0, 10))

  return new Response(JSON.stringify({
    ok: true,
    processed,
    inserted,
    updated,
    errors: errors.slice(0, 20)
  }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

export const config = {
  schedule: '0 7,13,19 * * *'  // 7am, 1pm, 7pm UTC (adjust as needed)
}
