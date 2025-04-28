addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)

  // En-têtes de sécurité
  const securityHeaders = {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  }
  
  // Enable CORS avec en-têtes de sécurité
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    ...securityHeaders
  }

  // Route racine - retourner un message d'accueil
  if (url.pathname === '/') {
    return new Response('API RadioGuessr - Utilisez les endpoints /api/places, /api/page/:id ou /api/listen/:id/channel.mp3', {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
    })
  }

  // Handle routes
  if (url.pathname.startsWith('/api/places')) {
    const response = await fetch('https://radio.garden/api/ara/content/places')
    const data = await response.json()
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  if (url.pathname.startsWith('/api/page/')) {
    const id = url.pathname.split('/')[3]
    const response = await fetch(`https://radio.garden/api/ara/content/page/${id}`)
    const data = await response.json()
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  if (url.pathname.startsWith('/api/listen/')) {
    const id = url.pathname.split('/')[3]
    const response = await fetch(`https://radio.garden/api/ara/content/listen/${id}/channel.mp3`)
    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'audio/mpeg' }
    })
  }

  // Route non trouvée
  return new Response('Not Found', { 
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
  })
}