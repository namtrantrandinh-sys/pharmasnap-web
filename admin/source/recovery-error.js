// Only static, account-neutral recovery help codes may reach the screen.
const problems = Object.freeze({
  otp_expired: ['The reset code is incorrect, expired or already used. Use the latest code and the email that received it, or send a new one.', 'OTP_EXPIRED'],
  over_request_rate_limit: ['Too many recovery attempts. Wait a few minutes before trying again.', 'RESET_TRY_LATER'],
  over_email_send_rate_limit: ['Too many recovery attempts. Wait a few minutes before trying again.', 'RESET_TRY_LATER'],
  validation_failed: ['The email or code format was not accepted. Use the email that received the code and enter the code again.', 'RESET_FORMAT'],
  captcha_failed: ['The recovery security check did not complete. Use the app’s recovery option or contact support.', 'RESET_SECURITY_CHECK'],
});
const statuses = new Set([400,401,403,404,409,422,429,500,502,503,504]);
export function recoveryProblem(error) {
  if (!error) return 'The email step did not return a recovery session. Send a new code and try again. Support reference: RESET_NO_SESSION.';
  const code = typeof error.code === 'string' ? error.code : '';
  const problem = Object.prototype.hasOwnProperty.call(problems, code) ? problems[code] : ['The code could not be used. Use the latest code from your email, or send a new one.', 'RESET_REJECTED'];
  const status = statuses.has(error.status) ? ` (HTTP ${error.status})` : '';
  return `${problem[0]} Support reference: ${problem[1]}${status}.`;
}
