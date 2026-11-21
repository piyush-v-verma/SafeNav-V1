const EMAIL_CONFIRMATION_CODES = new Set([
  'email_not_confirmed',
  'email_address_not_confirmed',
]);

export function isEmailConfirmationError(error) {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();

  return (
    EMAIL_CONFIRMATION_CODES.has(code) ||
    message.includes('email not confirmed') ||
    message.includes('email address not confirmed')
  );
}

export function getEmailCheckErrorMessage(error) {
  if (!error) return 'Something went wrong. Please try again later.';

  const code = String(error?.code || '').toUpperCase();
  const status = Number(error?.status || error?.statusCode || 0);
  const message = String(error?.message || '').toLowerCase();

  // Network / Connection errors
  if (
    code === 'NETWORK_ERROR' ||
    error?.name === 'TypeError' ||
    error?.name === 'NetworkError' ||
    message.includes('network') ||
    message.includes('failed to fetch') ||
    message.includes('fetch failed') ||
    message.includes('internet disconnected') ||
    (typeof navigator !== 'undefined' && navigator.onLine === false)
  ) {
    return 'Unable to connect. Check your internet connection.';
  }

  // 422: Please enter a valid email address.
  if (status === 422 || code === 'VALIDATION_ERROR' || message.includes('valid email')) {
    return 'Please enter a valid email address.';
  }

  // 429: Too many attempts. Please try again later.
  if (
    status === 429 ||
    code === 'RATE_LIMIT_EXCEEDED' ||
    code === 'OVER_REQUEST_RATE_LIMIT' ||
    message.includes('rate limit') ||
    message.includes('too many')
  ) {
    return 'Too many attempts. Please try again later.';
  }

  // 503: Server unavailable. Please try again later.
  if (
    status === 503 ||
    status === 502 ||
    status === 504 ||
    code === 'AUTH_SERVICE_UNAVAILABLE' ||
    error?.name === 'AbortError' ||
    message.includes('timeout') ||
    message.includes('service unavailable') ||
    message.includes('server unavailable')
  ) {
    return 'Server unavailable. Please try again later.';
  }

  // 500: Something went wrong. Please try again later.
  if (status === 500 || code === 'INTERNAL_SERVER_ERROR' || code === 'DATABASE_ERROR') {
    return 'Something went wrong. Please try again later.';
  }

  return 'Something went wrong. Please try again later.';
}

export function getLoginErrorMessage(error) {
  if (!error) return 'Something went wrong. Please try again later.';

  // If error is a direct code string
  if (typeof error === 'string') {
    const raw = error.trim().toUpperCase();
    if (raw === 'USER_NOT_FOUND' || raw === 'WRONG_PASSWORD' || raw === 'INVALID_CREDENTIALS') {
      return 'Email or password is incorrect.';
    }
    if (raw === 'VALIDATION_ERROR') return 'Please enter a valid email and password.';
    if (raw === 'DATABASE_ERROR') return 'Something went wrong. Please try again later.';
    if (raw === 'AUTH_SERVICE_UNAVAILABLE') return 'Server unavailable. Please try again later.';
    if (raw === 'NETWORK_ERROR') return 'Unable to connect. Check your internet connection.';
    if (raw === 'INTERNAL_SERVER_ERROR') return 'Something went wrong. Please try again later.';
  }

  const rawCode =
    error?.code ||
    error?.error_code ||
    error?.error ||
    error?.detail?.code ||
    (typeof error?.detail === 'string' ? error.detail : '') ||
    '';
  const code = String(rawCode).trim();
  const codeUpper = code.toUpperCase();
  const codeLower = code.toLowerCase();

  const rawMessage =
    error?.message ||
    error?.detail?.message ||
    (typeof error?.detail === 'string' ? error.detail : '') ||
    '';
  const message = String(rawMessage).trim().toLowerCase();

  const status = Number(error?.status || error?.statusCode || 0);

  // 1. Network / Offline errors
  if (
    codeUpper === 'NETWORK_ERROR' ||
    error?.name === 'TypeError' ||
    error?.name === 'NetworkError' ||
    message.includes('network') ||
    message.includes('failed to fetch') ||
    message.includes('fetch failed') ||
    message.includes('internet disconnected') ||
    message.includes('offline') ||
    (typeof navigator !== 'undefined' && navigator.onLine === false)
  ) {
    return 'Unable to connect. Check your internet connection.';
  }

  // Supabase intentionally does not distinguish unknown emails from wrong passwords.
  if (
    codeUpper === 'INVALID_CREDENTIALS' ||
    codeLower === 'invalid_credentials' ||
    codeLower === 'invalid_grant' ||
    codeLower === 'user_not_found' ||
    codeLower === 'wrong_password' ||
    message.includes('invalid credentials') ||
    message.includes('invalid login credentials') ||
    message.includes('invalid email or password') ||
    message.includes('user not found') ||
    message.includes('user_not_found') ||
    message.includes('email not registered') ||
    message.includes('no user found') ||
    message.includes('wrong password') ||
    message.includes('wrong_password') ||
    message.includes('incorrect password')
  ) {
    return 'Email or password is incorrect.';
  }

  // Validation Error
  if (
    codeUpper === 'VALIDATION_ERROR' ||
    codeLower === 'validation_error' ||
    codeLower === 'validation_failed' ||
    codeLower === 'email_address_invalid' ||
    status === 422 ||
    message.includes('validation error') ||
    message.includes('validation failed') ||
    message.includes('valid email')
  ) {
    return 'Please enter a valid email and password.';
  }

  // Auth Service Unavailable / Server Unavailable / Timeouts
  if (
    codeUpper === 'AUTH_SERVICE_UNAVAILABLE' ||
    codeLower === 'auth_service_unavailable' ||
    codeLower === 'service_unavailable' ||
    (status >= 500 && status <= 599) ||
    error?.name === 'AbortError' ||
    message.includes('timeout') ||
    message.includes('service unavailable') ||
    message.includes('server unavailable') ||
    message.includes('temporarily unavailable')
  ) {
    return 'Server unavailable. Please try again later.';
  }

  // Database Error
  if (
    codeUpper === 'DATABASE_ERROR' ||
    codeLower === 'database_error' ||
    message.includes('database') ||
    message.includes('postgres') ||
    message.includes('pgrst')
  ) {
    return 'Something went wrong. Please try again later.';
  }

  // Internal Server Error
  if (
    codeUpper === 'INTERNAL_SERVER_ERROR' ||
    codeLower === 'internal_server_error' ||
    codeLower === 'unexpected_failure' ||
    status === 500 ||
    message.includes('internal server error')
  ) {
    return 'Something went wrong. Please try again later.';
  }

  // Rate limiting (Supabase / API)
  if (
    codeLower === 'over_request_rate_limit' ||
    codeLower === 'over_email_send_rate_limit' ||
    status === 429 ||
    message.includes('rate limit')
  ) {
    return 'For security, please wait a minute before trying again.';
  }

  // Email not confirmed
  if (isEmailConfirmationError(error)) {
    return 'Please verify your email using the link we sent before signing in.';
  }

  // Fallback: Never display raw backend error messages, stack traces or technical details
  return 'Something went wrong. Please try again later.';
}

export function getAuthErrorMessage(error, context = 'login') {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();

  if (isEmailConfirmationError(error)) {
    return 'Please verify your email using the link we sent before signing in. You can request a new verification email below.';
  }

  if (
    code === 'over_email_send_rate_limit' ||
    message.includes('rate limit') ||
    message.includes('over_email_send_rate_limit')
  ) {
    return 'For security, please wait a minute before requesting another recovery email.';
  }

  if (
    code === 'otp_expired' ||
    code === 'token_expired' ||
    message.includes('link is invalid or has expired') ||
    message.includes('token has expired')
  ) {
    return 'That verification link has expired or is invalid. Sign in to request a new verification email.';
  }

  if (
    code === 'email_exists' ||
    code === 'user_already_exists' ||
    message.includes('user already registered') ||
    message.includes('email already registered')
  ) {
    return 'An account may already exist for this email. Try signing in or resetting your password.';
  }

  if (
    code === 'invalid_credentials' ||
    message.includes('invalid login credentials') ||
    message.includes('invalid email or password')
  ) {
    return 'Email or password is incorrect.';
  }

  if (
    code === 'email_address_invalid' ||
    code === 'validation_failed' && message.includes('email') ||
    message.includes('invalid email')
  ) {
    return 'Enter a valid email address.';
  }

  if (code === 'user_already_confirmed' || message.includes('user already confirmed')) {
    return 'This email may already be verified. Try signing in.';
  }

  if (
    error?.name === 'TypeError' ||
    message.includes('failed to fetch') ||
    message.includes('network request failed') ||
    message.includes('fetch failed')
  ) {
    return 'Unable to reach the authentication service. Check your connection and try again.';
  }

  if (message.includes('not configured') || message.includes('placeholder-project')) {
    return 'Authentication is not configured. Check the Supabase settings in frontend/.env.';
  }

  if (context === 'resetPassword') {
    return 'Could not send recovery email. Check your details and try again.';
  }

  return context === 'signup'
    ? 'Could not create the account. Check the details and try again.'
    : 'Could not sign in. Check your details and try again.';
}
