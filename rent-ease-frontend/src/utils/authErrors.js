/**
 * Safe, universal authentication error message extractor.
 * Guarantees that neither "undefined", "null", "[object Object]", nor internal
 * stack traces are ever shown to the user.
 */
export function getAuthErrorMessage(error, defaultFallback = 'Unable to log in. Please try again.') {
  if (!error) return defaultFallback;

  // 1. Direct string error
  if (typeof error === 'string') {
    const trimmed = error.trim();
    if (isValidErrorMessage(trimmed)) {
      return trimmed;
    }
    return defaultFallback;
  }

  // 2. Axios response data
  const resData = error.response?.data;
  if (resData) {
    if (typeof resData === 'string' && isValidErrorMessage(resData)) {
      return resData.trim();
    }
    if (typeof resData === 'object') {
      if (typeof resData.message === 'string' && isValidErrorMessage(resData.message)) {
        return resData.message.trim();
      }
      if (typeof resData.error === 'string' && isValidErrorMessage(resData.error)) {
        return resData.error.trim();
      }
    }
  }

  // 3. Network or connection errors
  const code = error.code;
  const rawMsg = typeof error.message === 'string' ? error.message.trim() : '';

  if (
    code === 'ERR_NETWORK' ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    rawMsg === 'Network Error' ||
    (!error.response && !error.status)
  ) {
    return 'Unable to connect to the server. Please try again.';
  }

  // 4. Status-specific clean messages
  const status = error.response?.status || error.status;
  if (status === 503) {
    return 'Database connection is unavailable. Please start MongoDB and try again.';
  }
  if (status === 500) {
    return 'Something went wrong. Please try again.';
  }
  if (status === 401) {
    return 'Invalid email or password.';
  }
  if (status === 404) {
    return 'Unable to connect to the server. Please try again.';
  }

  // 5. Standard Error instance message
  if (rawMsg && isValidErrorMessage(rawMsg)) {
    return rawMsg;
  }

  return defaultFallback;
}

function isValidErrorMessage(msg) {
  if (!msg || typeof msg !== 'string') return false;
  const lower = msg.trim().toLowerCase();
  if (
    !lower ||
    lower === 'undefined' ||
    lower === 'undefined.' ||
    lower === 'null' ||
    lower === 'null.' ||
    lower === '[object object]' ||
    lower.startsWith('<!doctype') ||
    lower.startsWith('<html') ||
    lower.includes('cannot destructure property')
  ) {
    return false;
  }
  return true;
}
