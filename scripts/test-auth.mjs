// Automated Security & Auth Test Suite
const BASE_URL = 'http://localhost:3000'

async function runTests() {
  console.log('=== Det 7:e Gunget Security & Auth Test Suite ===\n')
  let passed = 0
  let total = 0

  function assert(condition, testName) {
    total++
    if (condition) {
      console.log(`[PASS] ${testName}`)
      passed++
    } else {
      console.error(`[FAIL] ${testName}`)
    }
  }

  // 1. Unauthenticated access to /api/admin/users -> 401
  try {
    const res = await fetch(`${BASE_URL}/api/admin/users`)
    assert(res.status === 401, 'Unauthenticated GET /api/admin/users is blocked (401)')
  } catch (e) {
    console.error('Error 1:', e.message)
  }

  // 2. Unauthenticated POST to /api/admin/gigs -> 401
  try {
    const res = await fetch(`${BASE_URL}/api/admin/gigs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ venue: 'Hacker Club', city: 'Nowhere', date: '2026-09-01' }),
    })
    assert(res.status === 401, 'Unauthenticated POST /api/admin/gigs is blocked (401)')
  } catch (e) {
    console.error('Error 2:', e.message)
  }

  // 3. Login with invalid password -> 401
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'janis', password: 'wrongpassword' }),
    })
    assert(res.status === 401, 'Login with wrong password is rejected (401)')
  } catch (e) {
    console.error('Error 3:', e.message)
  }

  // 4. Login as Janis with gunget2026! -> 200 OK & Cookie
  let sessionCookie = ''
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'janis@det7egunget.se', password: 'gunget2026!' }),
    })
    const data = await res.json()
    const setCookieHeader = res.headers.get('set-cookie')
    if (setCookieHeader) {
      sessionCookie = setCookieHeader.split(';')[0]
    }
    assert(res.status === 200 && data.user?.username === 'janis', 'Login as Janis succeeds (200)')
    assert(sessionCookie.startsWith('gunget_session='), 'Sets secure gunget_session cookie')
  } catch (e) {
    console.error('Error 4:', e.message)
  }

  // 5. GET /api/auth/me with session cookie -> 200 & Janis profile
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: sessionCookie },
    })
    const data = await res.json()
    assert(res.status === 200 && data.authenticated === true && data.user.name === 'Janis', 'GET /api/auth/me returns authenticated user')
  } catch (e) {
    console.error('Error 5:', e.message)
  }

  // 6. GET /api/admin/users with session cookie -> 200 & 4 band admins
  try {
    const res = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { Cookie: sessionCookie },
    })
    const users = await res.json()
    assert(res.status === 200 && Array.isArray(users) && users.length >= 4, `GET /api/admin/users lists all seeded admins (count: ${users.length})`)
  } catch (e) {
    console.error('Error 6:', e.message)
  }

  // 7. Add new admin via POST /api/admin/users -> 200
  let newAdminId = ''
  try {
    const res = await fetch(`${BASE_URL}/api/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({
        name: 'Gästtekniker',
        email: 'soundguy@det7egunget.se',
        username: 'soundguy',
        role: 'Ljudtekniker',
        password: 'soundpassword123',
      }),
    })
    const data = await res.json()
    newAdminId = data.user?.id
    assert(res.status === 200 && data.user?.email === 'soundguy@det7egunget.se', 'Creating new admin succeeds (200)')
  } catch (e) {
    console.error('Error 7:', e.message)
  }

  // 8. Self-deletion attempt -> 400 Bad Request
  try {
    const res = await fetch(`${BASE_URL}/api/admin/users`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ id: 'admin-janis' }),
    })
    assert(res.status === 400, 'Self-deletion is blocked (400)')
  } catch (e) {
    console.error('Error 8:', e.message)
  }

  // 9. Delete created admin -> 200 OK
  try {
    const res = await fetch(`${BASE_URL}/api/admin/users`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ id: newAdminId }),
    })
    const data = await res.json()
    assert(res.status === 200 && data.success === true, 'Deleting created admin succeeds (200)')
  } catch (e) {
    console.error('Error 9:', e.message)
  }

  // 10. Logout and verify subsequent call is 401
  try {
    const res = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: sessionCookie },
    })
    assert(res.status === 200, 'Logout succeeds (200)')

    const postLogout = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { Cookie: sessionCookie },
    })
    assert(postLogout.status === 401, 'Subsequent request after logout is blocked (401)')
  } catch (e) {
    console.error('Error 10:', e.message)
  }

  console.log(`\n=== Results: ${passed}/${total} tests passed ===`)
  if (passed === total) {
    console.log('ALL AUTH & SECURITY TESTS PASSED!')
  }
}

runTests()
