import { useState } from "react";

/**
 * rules: { fieldName: (value, allValues) => errorString | null }
 * Returns { errors, validate, setFieldError, clearErrors }
 */
export function useValidation(rules) {
  const [errors, setErrors] = useState({});

  function validate(values) {
    const newErrors = {};
    for (const [field, ruleFn] of Object.entries(rules)) {
      const msg = ruleFn(values[field], values);
      if (msg) newErrors[field] = msg;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function setFieldError(field, msg) {
    setErrors((e) => ({ ...e, [field]: msg }));
  }

  function clearField(field) {
    setErrors((e) => {
      const n = { ...e };
      delete n[field];
      return n;
    });
  }

  function clearErrors() {
    setErrors({});
  }

  // Merge server-side validation errors (from 422 responses)
  function applyServerErrors(errObj) {
    const flat = {};
    for (const [k, msgs] of Object.entries(errObj)) {
      flat[k] = Array.isArray(msgs) ? msgs[0] : msgs;
    }
    setErrors(flat);
  }

  return {
    errors,
    validate,
    setFieldError,
    clearField,
    clearErrors,
    applyServerErrors,
  };
}

// ── Common rule factories ─────────────────────────────────────────────────────

export const rules = {
  required: (label) => (v) =>
    (!v && v !== 0) || String(v).trim() === "" ? `${label} is required` : null,

  minLength: (min, label) => (v) =>
    v && String(v).trim().length < min
      ? `${label} must be at least ${min} characters`
      : null,

  maxLength: (max, label) => (v) =>
    v && String(v).length > max
      ? `${label} must be no more than ${max} characters`
      : null,

  positiveInt: (label) => (v) => {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1)
      return `${label} must be a whole number greater than 0`;
    return null;
  },

  nonNegativeInt: (label) => (v) => {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0)
      return `${label} must be 0 or a positive whole number`;
    return null;
  },

  nonNegativeNumber: (label) => (v) => {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    if (isNaN(n) || n < 0) return `${label} must be 0 or a positive number`;
    return null;
  },

  dateFormat: (label) => (v) => {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? `${label} must be a valid date` : null;
  },

  oneOf: (options, label) => (v) => {
    if (!v) return null;
    return options.includes(v)
      ? null
      : `${label} must be one of: ${options.join(", ")}`;
  },

  password: () => (v) => {
    if (!v) return null;
    if (v.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(v))
      return "Password must contain at least one uppercase letter";
    if (!/[0-9]/.test(v)) return "Password must contain at least one number";
    return null;
  },

  match: (otherField, label) => (v, all) => {
    return v !== all[otherField] ? `${label} does not match` : null;
  },
};
