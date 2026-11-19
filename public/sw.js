self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Response DX', body: 'New notification' }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Response DX', {
      body: data.body || '',
      icon: '/icon.png',
      badge: '/icon.png',
      data: data.url || '/'
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  )
})
