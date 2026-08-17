const endpoints = [
  '/',
  '/gigs',
  '/music',
  '/about',
  '/gallery',
  '/fancentral',
  '/contact',
  '/admin',
  '/api/gigs',
  '/api/band',
  '/api/gallery',
  '/api/songs',
]

for (const ep of endpoints) {
  try {
    const res = await fetch(`http://localhost:3000${ep}`)
    console.log(`[${res.status}] ${ep}`)
    if (ep.startsWith('/api/')) {
      const data = await res.json()
      console.log(`   Fetched:`, Array.isArray(data) ? `${data.length} items` : Object.keys(data))
    }
  } catch (err) {
    console.error(`Error on ${ep}:`, err.message)
  }
}

