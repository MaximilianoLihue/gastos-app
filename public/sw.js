const RECEIPT_CACHE = 'shared-receipt-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  if (url.pathname === '/share-target' && event.request.method === 'POST') {
    event.respondWith(handleShareTarget(event.request))
  }
})

async function handleShareTarget(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (file) {
      const cache = await caches.open(RECEIPT_CACHE)
      await cache.put(
        '/pending-receipt',
        new Response(file, {
          headers: {
            'Content-Type': file.type || 'image/jpeg',
            'X-File-Name': file.name || 'comprobante.jpg',
          },
        })
      )
    }
  } catch (e) {
    console.error('[SW] share-target error:', e)
  }

  return Response.redirect('/transacciones?shared=1', 303)
}
