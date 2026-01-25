export function createFetchJSON({ debugTransport, webSerialTransport, httpFetchJSON }) {
  return async function fetchJSON(url, options = {}) {
    if (debugTransport && debugTransport.handles(url, options)) {
      return debugTransport.handle(url, options);
    }
    if (webSerialTransport && webSerialTransport.handles(url, options)) {
      return webSerialTransport.handle(url, options);
    }
    return httpFetchJSON(url, options);
  };
}
