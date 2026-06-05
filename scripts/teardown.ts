/**
 * npm run teardown
 *
 * Removes all test data created by the seed script:
 *   - Deletes the TEST competition (cascades to members, picks, submissions)
 *   - Deletes the 10 test auth users (cascades to profiles)
 *
 * Safe — only removes records identifiable as test data.
 * Will NOT touch any real user data.
 */

import { adminClient } from './_client.js'

const COMPETITION_CODE = 'TEST01'
const TEST_EMAIL_DOMAIN = '@phase23dev.com'

async function main() {
  console.log('\n🗑️   Phase23 Test Data Teardown')
  console.log('────────────────────────────────────────\n')

  // 1. Delete test competition (cascades to members, picks, stage_submissions, tournament_predictions)
  const { data: comp } = await adminClient
    .from('competitions')
    .select('id, name')
    .eq('join_code', COMPETITION_CODE)
    .maybeSingle()

  if (comp) {
    const { error } = await adminClient
      .from('competitions')
      .delete()
      .eq('id', comp.id)
    if (error) {
      console.error(`❌  Failed to delete competition: ${error.message}`)
    } else {
      console.log(`✓  Deleted competition "${comp.name}"`)
    }
  } else {
    console.log(`—  No test competition found (already clean)`)
  }

  // 2. Delete test auth users
  const { data: { users }, error: listErr } = await adminClient.auth.admin.listUsers({ perPage: 1000 })

  if (listErr) {
    console.error(`❌  Could not list users: ${listErr.message}`)
    process.exit(1)
  }

  const testUsers = users.filter(u => u.email?.endsWith(TEST_EMAIL_DOMAIN))

  if (testUsers.length === 0) {
    console.log(`—  No test users found (already clean)`)
  } else {
    for (const u of testUsers) {
      const { error } = await adminClient.auth.admin.deleteUser(u.id)
      if (error) {
        console.log(`  ⚠️  Could not delete ${u.email}: ${error.message}`)
      } else {
        console.log(`  ✓  Deleted ${u.email}`)
      }
    }
  }

  console.log('\n✅  Teardown complete — dev database is clean.\n')
}

main().catch(err => {
  console.error('❌  Unexpected error:', err)
  process.exit(1)
})
