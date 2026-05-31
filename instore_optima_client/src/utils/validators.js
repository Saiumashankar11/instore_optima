// ─── Shared Validation Utilities ─────────────────────────────────────────────

const IST = { timeZone: 'Asia/Kolkata' }

/** Ensure UTC parsing — backend may omit the Z suffix */
const toUTC = (d) => {
  if (!d) return null
  const s = String(d)
  // If no timezone info, assume UTC by appending Z
  return new Date(s.endsWith('Z') || s.includes('+') || s.includes('-', 10) ? s : s + 'Z')
}

/** Format a date string/object as IST date only: "28 May 2026" */
export const fmtDate = (d) => {
  const dt = toUTC(d)
  if (!dt || isNaN(dt)) return '—'
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', ...IST })
}

/** Format a date string/object as IST date + time: "28 May 2026, 03:45:10 pm" */
export const fmtDateTime = (d) => {
  const dt = toUTC(d)
  if (!dt || isNaN(dt)) return '—'
  return dt.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    ...IST
  })
}

export const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/
export const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/
const lettersOnlyRegex = /^[a-zA-Z\s'\-.]+$/
const hasLetterRegex = /[a-zA-Z]/

/**
 * Validate a single field and return error string or ''
 */
export function validateField(field, value, extra = {}) {
  const v = (value ?? '').toString().trim()

  switch (field) {
    case 'name':
      if (!v) return 'Name is required.'
      if (v.length < 2) return 'Name must be at least 2 characters.'
      if (v.length > 100) return 'Name must be under 100 characters.'
      if (!lettersOnlyRegex.test(v)) return 'Name must only contain letters, spaces, or hyphens.'
      return ''

    case 'email':
      if (!v) return 'Email is required.'
      if (!emailRegex.test(v)) return 'Enter a valid email (e.g. name@example.com).'
      return ''

    case 'password':
      if (!v) return 'Password is required.'
      if (v.length < 6) return 'Password must be at least 6 characters.'
      if (!passwordRegex.test(v)) return 'Must contain uppercase, lowercase, and a number.'
      return ''

    case 'role':
      if (!v) return 'Role is required.'
      if (!['Admin', 'Manager', 'Staff'].includes(v)) return 'Role must be Admin, Manager, or Staff.'
      return ''

    // ── Products ──
    case 'productName':
      if (!v) return 'Product name is required.'
      if (v.length < 2) return 'Name must be at least 2 characters.'
      if (!hasLetterRegex.test(v)) return 'Product name must contain at least one letter.'
      if (/^[\d\s]+$/.test(v)) return 'Product name cannot be numbers only.'
      return ''

    case 'description':
      if (v && !hasLetterRegex.test(v)) return 'Description must contain at least one letter.'
      if (v && /^[\d\s]+$/.test(v)) return 'Description cannot be numbers only.'
      return ''

    case 'price':
      if (v === '' || v === undefined) return 'Price is required.'
      if (isNaN(Number(v)) || Number(v) < 0) return 'Price must be a positive number.'
      return ''

    case 'minStock':
      if (!v) return 'Min stock is required.'
      if (isNaN(Number(v)) || Number(v) < 1) return 'Min stock must be at least 1.'
      return ''

    case 'maxStock':
      if (!v) return 'Max stock is required.'
      if (isNaN(Number(v)) || Number(v) < 1) return 'Max stock must be at least 1.'
      if (extra.minStock !== undefined && Number(v) < Number(extra.minStock)) return 'Max stock must be ≥ min stock.'
      return ''

    case 'supplierId':
      if (!v) return 'Supplier is required.'
      return ''

    // ── Stock ──
    case 'currentStock':
      if (v === '' || v === undefined) return 'Stock quantity is required.'
      if (isNaN(Number(v)) || Number(v) < 0) return 'Stock must be 0 or more.'
      return ''

    case 'productId':
      if (!v) return 'Please select a product.'
      return ''

    // ── Suppliers ──
    case 'supplierName':
      if (!v) return 'Company name is required.'
      if (v.length < 2) return 'Name must be at least 2 characters.'
      if (!lettersOnlyRegex.test(v)) return 'Company name must only contain letters, spaces, or hyphens.'
      return ''

    case 'contact':
      if (!v) return 'Contact person is required.'
      if (!lettersOnlyRegex.test(v)) return 'Contact name must only contain letters, spaces, or hyphens.'
      return ''

    case 'reason':
      if (!v) return 'Please provide a reason.'
      if (/\d/.test(v)) return 'Reason must not contain numbers.'
      return ''

    case 'supplierEmail':
      if (!v) return 'Email is required.'
      if (!emailRegex.test(v)) return 'Enter a valid email address.'
      return ''

    // ── Payments ──
    case 'orderId':
      if (!v) return 'Please select an order.'
      return ''

    default:
      return ''
  }
}

/**
 * Validate multiple fields at once. Returns { fieldErrors: {}, isValid: boolean }
 */
export function validateForm(fields) {
  const errors = {}
  let isValid = true
  for (const { field, value, extra } of fields) {
    const err = validateField(field, value, extra)
    if (err) {
      errors[field] = err
      isValid = false
    }
  }
  return { fieldErrors: errors, isValid }
}

/**
 * Parse backend API error into a user-friendly message
 */
export function parseApiError(err) {
  if (!err) return 'An unexpected error occurred.'
  if (err.code === 'ERR_NETWORK') return 'Backend is not live. Please start the backend server and try again.'
  if (err.code === 'ECONNABORTED') return 'Request timed out. Backend may be unresponsive.'

  const data = err.response?.data
  const status = err.response?.status

  // ── 1. ALWAYS prefer the specific message the backend gave us ──────────────
  // Field-level validation errors, e.g. { errors: { Email: ["Email already registered"] } }
  if (data && data.errors && typeof data.errors === 'object') {
    const firstError = Object.values(data.errors).flat().find(Boolean)
    if (firstError) return firstError
  }
  // A meaningful top-level message (skip the generic validation envelope title)
  if (data && typeof data.message === 'string' && data.message.trim() &&
      data.message !== 'One or more validation errors occurred.') {
    return data.message
  }
  if (typeof data === 'string' && data.trim()) return data

  // ── 2. Fall back to friendly text based on the HTTP status ─────────────────
  if (status === 502 || status === 503) return 'Backend is not live. Please start the backend server and try again.'
  if (status === 400) return 'Please check your inputs and try again.'
  if (status === 401) return 'Your session has expired. Please sign in again.'
  if (status === 403) return 'You do not have permission to perform this action.'
  if (status === 404) return 'The requested resource was not found.'
  if (status === 409) return 'This action conflicts with existing records and cannot be completed.'
  if (status >= 500) return 'Server error — please try again later or contact support.'

  return err.message || 'Something went wrong. Please try again.'
}
