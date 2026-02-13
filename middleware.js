export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

// User credentials and access levels
const USERS = {
  tony: {
    password: 'vtkl2026',
    access: 'all',  // Full access
    hub: '/hub-tony.html'
  },
  dukane: {
    password: 'wong2026',
    access: ['/hub-dukane.html', '/family.html', '/meals.html'],
    hub: '/hub-dukane.html'
  },
  joana: {
    password: 'akira-joana-2026',
    access: ['/products.html', '/product-creation.html', '/Akira-PMO-SeeItCycle-Org.html', '/aipmo-process-flow.html', '/research-multi-city.html', '/research-gartner.html', '/sprint-pulse.html', '/sprint-audit.html'],
    hub: '/products.html'
  },
  victor: {
    password: 'akira-victor-2026',
    access: ['/products.html', '/product-creation.html', '/Akira-PMO-SeeItCycle-Org.html', '/aipmo-process-flow.html', '/research-multi-city.html', '/research-gartner.html', '/sprint-pulse.html', '/sprint-audit.html'],
    hub: '/products.html'
  }
};

export default function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  const authHeader = request.headers.get('authorization');
  
  if (authHeader) {
    try {
      const [scheme, encoded] = authHeader.split(' ');
      
      if (scheme === 'Basic' && encoded) {
        const decoded = atob(encoded);
        const [username, password] = decoded.split(':');
        
        const user = USERS[username.toLowerCase()];
        
        if (user && user.password === password) {
          // Redirect root to user's specific hub
          if (pathname === '/' || pathname === '') {
            return Response.redirect(new URL(user.hub, request.url), 302);
          }
          
          // Check access level
          if (user.access === 'all') {
            return;  // Full access granted
          }
          
          // Check if user has access to this specific page
          if (user.access.includes(pathname) || user.access.includes(pathname.toLowerCase())) {
            return;  // Access granted for this page
          }
          
          // User authenticated but doesn't have access to this page
          return new Response(`
<!DOCTYPE html>
<html>
<head>
  <title>Access Denied</title>
  <style>
    body {
      font-family: -apple-system, system-ui, sans-serif;
      background: linear-gradient(135deg, #1a1f2e 0%, #141821 100%);
      color: #e4e4e4;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    h1 { color: #ef4444; font-size: 3rem; margin-bottom: 1rem; }
    p { color: #888; margin-bottom: 1.5rem; }
    a {
      color: #4ecdc4;
      text-decoration: none;
      padding: 0.75rem 1.5rem;
      border: 1px solid #4ecdc4;
      border-radius: 8px;
      display: inline-block;
    }
    a:hover { background: rgba(78, 205, 196, 0.1); }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚫</h1>
    <p>You don't have access to this page.</p>
    <a href="${user.hub}">← Back to your dashboard</a>
  </div>
</body>
</html>
          `, {
            status: 403,
            headers: {
              'Content-Type': 'text/html',
            },
          });
        }
      }
    } catch (e) {
      // Invalid auth header, fall through to 401
    }
  }

  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Greg Dashboard"',
      'Cache-Control': 'no-store',
    },
  });
}
