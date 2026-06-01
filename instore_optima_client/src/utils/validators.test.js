import { describe, it, expect } from 'vitest'
import { validateField, parseApiError, emailRegex, passwordRegex } from './validators'

describe('validateField', () => {
  it('requires a name and rejects too-short / invalid names', () => {
    expect(validateField('name', '')).toMatch(/required/i)
    expect(validateField('name', 'A')).toMatch(/at least 2/i)
    expect(validateField('name', 'John123')).toMatch(/letters/i)
    expect(validateField('name', 'John Doe')).toBe('')
  })

  it('validates email format', () => {
    expect(validateField('email', '')).toMatch(/required/i)
    expect(validateField('email', 'not-an-email')).toMatch(/valid email/i)
    expect(validateField('email', 'sai@example.com')).toBe('')
  })

  it('enforces password complexity', () => {
    expect(validateField('password', '')).toMatch(/required/i)
    expect(validateField('password', 'abc')).toMatch(/at least 6/i)
    expect(validateField('password', 'alllowercase1')).toMatch(/uppercase|lowercase|number/i)
    expect(validateField('password', 'Valid123')).toBe('')
  })
})

describe('regexes', () => {
  it('emailRegex accepts valid and rejects invalid', () => {
    expect(emailRegex.test('a.b+c@x.co')).toBe(true)
    expect(emailRegex.test('a@b')).toBe(false)
  })
  it('passwordRegex needs upper, lower, digit, len>=6', () => {
    expect(passwordRegex.test('Abc123')).toBe(true)
    expect(passwordRegex.test('abc123')).toBe(false)
  })
})

describe('parseApiError', () => {
  it('returns a friendly network message for ERR_NETWORK', () => {
    expect(parseApiError({ code: 'ERR_NETWORK' })).toMatch(/backend is not live/i)
  })

  it('surfaces backend field-level errors first (the duplicate-email fix)', () => {
    const err = { response: { status: 400, data: { errors: { Email: ['Email already registered'] } } } }
    expect(parseApiError(err)).toBe('Email already registered')
  })

  it('prefers a meaningful backend message over the generic 400 text', () => {
    const err = { response: { status: 400, data: { message: 'Order is locked.' } } }
    expect(parseApiError(err)).toBe('Order is locked.')
  })

  it('ignores the generic validation envelope title and falls through', () => {
    const err = { response: { status: 400, data: { message: 'One or more validation errors occurred.' } } }
    expect(parseApiError(err)).toMatch(/check your inputs/i)
  })

  it('maps bare status codes to friendly text when no body is given', () => {
    expect(parseApiError({ response: { status: 403 } })).toMatch(/permission/i)
    expect(parseApiError({ response: { status: 404 } })).toMatch(/not found/i)
    expect(parseApiError({ response: { status: 500 } })).toMatch(/server error/i)
  })

  it('handles a null/undefined error safely', () => {
    expect(parseApiError(null)).toMatch(/unexpected/i)
  })
})
