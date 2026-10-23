// Writes seed SQL from data/handbook.md + seed history and applies it to D1.
// Usage: npm run db:seed            (local)
//        npm run db:seed -- --remote (deployed database)
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { buildSeedSql } from '../worker/lib/seed'

const remote = process.argv.includes('--remote')
const handbook = readFileSync('data/handbook.md', 'utf8')
const outFile = '.wrangler/seed.sql'

mkdirSync('.wrangler', { recursive: true })
writeFileSync(outFile, buildSeedSql(handbook))
console.log(`Wrote ${outFile}`)

execFileSync(
  'npx',
  [
    'wrangler',
    'd1',
    'execute',
    'maple-grove',
    remote ? '--remote' : '--local',
    `--file=${outFile}`,
  ],
  { stdio: 'inherit' },
)
