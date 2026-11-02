// fetch-wrapper.js
// Wrap window.fetch to capture network connection/CORS/paused database errors gracefully.
// This prevents uncaught "Failed to fetch" promise rejections from escalating to the parent iframe.
(function() {
  const _originalFetch = window.fetch;
  
  const wrappedFetch = async function(...args) {
    let url = "";
    try {
      if (typeof args[0] === 'string') {
        url = args[0];
      } else if (args[0] && typeof args[0] === 'object' && 'url' in args[0]) {
        url = args[0].url;
      }
    } catch (e) {}

    try {
      return await _originalFetch.apply(window, args);
    } catch (err) {
      const errMsg = (err && err.message) || "";
      const isNetworkError = errMsg.includes("Failed to fetch") || 
                             errMsg.includes("NetworkError") || 
                             errMsg.includes("Network request failed") ||
                             errMsg.includes("Failed to load") ||
                             (err.name === "TypeError" && (errMsg === "" || errMsg.includes("fetch")));

      if (isNetworkError) {
        console.warn("Intercepted fetch failure gracefully:", errMsg || "NetworkError", "URL:", url);
        return new Response(JSON.stringify({
          error: "Service Unavailable",
          message: "Network connection failed or resource unreachable",
          isOffline: true,
          details: errMsg
        }), {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Content-Type": "application/json" }
        });
      }
      throw err;
    }
  };

  // Attempt to protect the wrapper from being overwritten
  try {
    Object.defineProperty(window, 'fetch', {
      value: wrappedFetch,
      writable: true,
      configurable: true // Allow some flexibility if absolutely needed by platform
    });
  } catch (e) {
    // Fallback if defineProperty fails
    window.fetch = wrappedFetch;
  }

  // Silence global unhandled rejections that are specifically "Failed to fetch"
  window.addEventListener('unhandledrejection', function(event) {
    const reason = event.reason;
    if (reason && (
      (reason.message && reason.message.includes('Failed to fetch')) || 
      (reason.name === 'TypeError' && reason.message && reason.message.includes('fetch')) ||
      (reason.name === 'NetworkError')
    )) {
      console.warn("Caught unhandled fetch rejection:", reason.message);
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  // Also catch generic errors that might be fetch-related
  window.addEventListener('error', function(event) {
    if (event.message && (event.message.includes('Failed to fetch') || event.message.includes('NetworkError'))) {
      console.warn("Caught global fetch error:", event.message);
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
})();
