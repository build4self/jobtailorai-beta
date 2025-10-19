// Handle direct URL access for SPA routing
(function() {
  // Only run this on the client side
  if (typeof window === 'undefined') return;
  
  const currentPath = window.location.pathname;
  const currentHash = window.location.hash;
  
  // If we're already using hash routing, don't redirect
  if (currentHash && currentHash.length > 1) return;
  
  // If we're on a direct path that should be handled by React Router
  if (currentPath && currentPath !== '/' && !currentPath.startsWith('/static/')) {
    // Redirect to hash-based routing
    const newUrl = window.location.origin + '/#' + currentPath + window.location.search;
    window.location.replace(newUrl);
  }
})();
