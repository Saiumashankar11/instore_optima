// ─── Shared Validation Utilities ─────────────────────────────────────────────

export const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/
export const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/

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
      return ''

    case 'price':
      if (v === '' || v === undefined) return 'Price is required.'
      if (isNaN(Number(v)) || Number(v) < 0) return 'Price must be a positive number.'
      return ''

    case 'minStock':
      if (v !== '' && (isNaN(Number(v)) || Number(v) < 0)) return 'Min stock must be 0 or more.'
      return ''

    case 'maxStock':
      if (v !== '' && (isNaN(Number(v)) || Number(v) < 0)) return 'Max stock must be 0 or more.'
      if (v !== '' && extra.minStock !== undefined && Number(v) < Number(extra.minStock)) return 'Max stock must be ≥ min stock.'
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
      return ''

    case 'contact':
      if (!v) return 'Contact person is required.'
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

  if (status === 502 || status === 503) return 'Backend is not live. Please start the backend server and try again.'
  if (status === 400) return 'Invalid data submitted. Please check your inputs.'
  if (status === 403) return 'You do not have permission to perform this action.'
  if (status === 404) return 'The requested resource was not found.'
  if (status === 409) return 'A conflict occurred. The data may have been modified.'
  if (status >= 500) return 'Server error — please try again later or contact support.'

  if (!data) return err.message || 'Something went wrong. Please try again.'

  // Field-level validation errors from backend
  if (data.errors && typeof data.errors === 'object') {
    const firstError = Object.values(data.errors).flat()[0]
    if (firstError) return firstError
  }

  if (data.message) return data.message
  if (typeof data === 'string') return data

  return 'An unexpected error occurred.'
}
