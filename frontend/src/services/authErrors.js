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
