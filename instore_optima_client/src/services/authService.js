// authService.js
// All API calls related to authentication, account management, and TOTP (authenticator app) setup.
// Every function returns an Axios promise; callers await it and handle errors via parseApiError.

import axiosClient from '../api/axiosClient'

// ── Login / Registration ──────────────────────────────────────────────────────
// POST /api/auth/login — submit email + password; returns JWT token and user object
export const loginApi          = (data) => axiosClient.post('/api/auth/login', data)
// POST /api/auth/register — create a new user account (Admin only in production)
export const registerApi       = (data) => axiosClient.post('/api/auth/register', data)

// ── OTP / MFA ─────────────────────────────────────────────────────────────────
// POST /api/auth/verify-otp — submit the 6-digit OTP sent by email or the TOTP code
export const verifyOtpApi      = (data) => axiosClient.post('/api/auth/verify-otp', data)
// POST /api/auth/resend-otp — resend the email OTP when it expires or is lost
export const resendOtpApi          = (data) => axiosClient.post('/api/auth/resend-otp', data)
// POST /api/auth/switch-to-email-otp — fall back to email OTP if the user can't use their authenticator app
export const switchToEmailOtpApi   = (data) => axiosClient.post('/api/auth/switch-to-email-otp', data)

// ── Password reset ────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password — trigger password-reset email with a one-time token
export const forgotPasswordApi = (data) => axiosClient.post('/api/auth/forgot-password', data)
// POST /api/auth/reset-password — set a new password using the token from the reset email
export const resetPasswordApi  = (data) => axiosClient.post('/api/auth/reset-password', data)

// ── Profile management ────────────────────────────────────────────────────────
// GET  /api/auth/profile — fetch the logged-in user's profile data
export const getProfileApi     = ()     => axiosClient.get('/api/auth/profile')
// PUT  /api/auth/profile — update profile fields (name, email, etc.)
export const updateProfileApi  = (data) => axiosClient.put('/api/auth/profile', data)
// POST /api/auth/change-password — change password while already logged in (requires old password)
export const changePasswordApi = (data) => axiosClient.post('/api/auth/change-password', data)

// ── TOTP / Authenticator app ──────────────────────────────────────────────────
// GET  /api/auth/totp/setup  — fetch the QR code and secret for the authenticator setup flow
export const totpSetupApi      = ()     => axiosClient.get('/api/auth/totp/setup')
// POST /api/auth/totp/enable — confirm setup by submitting the first code from the app
export const totpEnableApi     = (data) => axiosClient.post('/api/auth/totp/enable', data)
// POST /api/auth/totp/disable — turn off TOTP and revert to email OTP
export const totpDisableApi    = (data) => axiosClient.post('/api/auth/totp/disable', data)
