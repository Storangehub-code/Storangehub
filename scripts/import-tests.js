// import-tests.js
// Run with: node import-tests.js
// Requires: npm install xlsx @supabase/supabase-js
//
// Usage:
// 1. Place the Billing Excel in the same folder (or pass path as argument)
// 2. Set SUPABASE_URL and SUPABASE_SERVICE_KEY below (service role key, not anon)
// 3. node import-tests.js "Billing - All 03012026-10192026.xlsx"

import { createClient } from '@supabase/supabase-js'
import { createRequire } from 'module'
import fs from 'fs'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx')

// --- CONFIG ---
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://znvuvczlunpwjczjcbbt.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const excelPath = process.argv[2] || './Billing - All 03012026-10192026.xlsx'

if (!fs.existsSync(excelPath)) {
  console.error(`File not found: ${excelPath}`)
  process.exit(1)
}

console.log(`Reading ${excelPath}...`)

const workbook = XLSX.readFile(excelPath)
const sheet = workbook.Sheets[workbook.SheetNames[0]]
const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '', header: 1 })

// Find the row that contains the real headers (ORDNUM)
let headerRowIndex = -1
for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
  const row = rawRows[i] || []
  if (row.includes('ORDNUM')) {
    headerRowIndex = i
    break
  }
}

if (headerRowIndex === -1) {
  console.error('Could not find ORDNUM header row')
  process.exit(1)
}

const headers = rawRows[headerRowIndex]
const dataRows = rawRows.slice(headerRowIndex + 1)

console.log(`Found header on row ${headerRowIndex + 1}`)
console.log(`Data rows: ${dataRows.length}`)

// Convert to objects using the real headers
const rows = dataRows.map(row => {
  const obj = {}
  headers.forEach((h, i) => {
    if (h) obj[h] = row[i] || ''
  })
  return obj
}).filter(r => r.ORDNUM)

console.log(`Valid test rows: ${rows.length}`)

if (rows.length > 0) {
  console.log('Sample row:')
  console.log({
    ORDNUM: rows[0].ORDNUM,
    CLINICNAME: rows[0].CLINICNAME,
    DOCTOR: rows[0].DOCTOR,
    COLLECTDT: rows[0].COLLECTDT,
    TEST: rows[0].TEST
  })
}

// Cache clinics and providers so we don't hit the DB for every row
async function loadLookups() {
  const { data: clinics, error: cErr } = await supabase
    .from('clinics')
    .select('id, name')

  if (cErr) throw cErr

  const { data: providers, error: pErr } = await supabase
    .from('providers')
    .select('id, first_name, last_name, title, npi')

  if (pErr) throw pErr

  const clinicByName = {}
  clinics.forEach(c => {
    if (c.name) clinicByName[c.name.trim().toLowerCase()] = c
  })

  const providerByNpi = {}
  const providerByName = {}
  providers.forEach(p => {
    if (p.npi) providerByNpi[String(p.npi).trim()] = p
    const last = (p.last_name || '').trim()
    const first = (p.first_name || '').trim()
    if (last && first) {
      providerByName[`${last}, ${first}`.toLowerCase()] = p
      providerByName[`${first} ${last}`.toLowerCase()] = p
    }
  })

  console.log(`Loaded ${clinics.length} clinics, ${providers.length} providers`)
  if (clinics.length > 0) {
    console.log('Sample clinic:', { id: clinics[0].id, name: clinics[0].name })
  }
  return { clinicByName, providerByNpi, providerByName }
}

function parseDate(val) {
  if (!val) return null
  if (val instanceof Date) return val.toISOString().split('T')[0]
  // Excel serial date
  if (typeof val === 'number') {
    const d = new Date((val - 25569) * 86400 * 1000)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  }
  const s = String(val)
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  return null
}

function normalizeProviderName(raw) {
  if (!raw) return ''
  const s = String(raw).trim()
  const parts = s.split(',').map(p => p.trim())
  if (parts.length >= 2) {
    const last = parts[0]
    const first = parts[parts.length - 1]
    return `${last}, ${first}`.toLowerCase()
  }
  return s.toLowerCase()
}

async function main() {
  const { clinicByName, providerByNpi, providerByName } = await loadLookups()

  // Use a map to dedupe by accession (last one wins)
  const byAccession = new Map()
  let skipped = 0
  let noClinic = 0
  let noProvider = 0
  const unmatchedClinics = new Set()

  for (const row of rows) {
    const accession = String(row.ORDNUM || '').trim()
    if (!accession) {
      skipped++
      continue
    }

    const clinicName = String(row.CLINICNAME || '').trim()
    const providerRaw = String(row.DOCTOR || '').trim()
    const npi = String(row.GC_DC_NPI || '').trim()

    const clinic = clinicByName[clinicName.toLowerCase()]
    
    // Try NPI first, then name
    let provider = npi ? providerByNpi[npi] : null
    if (!provider && providerRaw) {
      const providerKey = normalizeProviderName(providerRaw)
      provider = providerByName[providerKey]
    }

    if (!clinic) {
      noClinic++
      if (clinicName) unmatchedClinics.add(clinicName)
      continue // skip tests with no clinic match
    }
    if (!provider) noProvider++

    byAccession.set(accession, {
      accession,
      collected: parseDate(row.COLLECTDT),
      finalized: parseDate(row.GP_ORD_SIGNOUTDT || row.ENTDT),
      test_type: String(row.TEST || '').trim(),
      clinic_id: clinic.id,
      provider_id: provider ? provider.id : null,
    })
  }

  const toInsert = Array.from(byAccession.values())

  console.log(`Prepared ${toInsert.length} unique tests (from ${rows.length} rows)`)
  console.log(`  Missing clinic match: ${noClinic}`)
  console.log(`  Missing provider match: ${noProvider}`)
  console.log(`  Skipped (no accession): ${skipped}`)

  if (toInsert.length > 0) {
    console.log('Sample test to insert:')
    console.log(toInsert[0])
  }

  if (unmatchedClinics.size > 0) {
    console.log(`Unmatched clinic names (${unmatchedClinics.size}):`)
    Array.from(unmatchedClinics).slice(0, 20).forEach(name => console.log(`  - ${name}`))
    if (unmatchedClinics.size > 20) console.log(`  ... and ${unmatchedClinics.size - 20} more`)
  }

  if (toInsert.length === 0) {
    console.log('No tests to insert.')
    return
  }

  // Try inserting just the first one to see the exact error
  console.log('Trying single insert first...')
  const { error: singleErr } = await supabase.from('tests').upsert([toInsert[0]], { onConflict: 'accession' })
  if (singleErr) {
    console.error('Single insert error:', singleErr.message)
    console.error('Full error:', singleErr)
    return
  }
  console.log('Single insert succeeded. Continuing with batches...')

  const batchSize = 200
  let inserted = 1

  for (let i = 1; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize)
    const { error } = await supabase.from('tests').upsert(batch, { onConflict: 'accession' })
    if (error) {
      console.error(`Batch error at ${i}:`, error.message)
    } else {
      inserted += batch.length
      console.log(`Inserted ${inserted} / ${toInsert.length}`)
    }
  }

  console.log('Done.')
  console.log('Provider and Practice names will now appear on the dashboard.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
