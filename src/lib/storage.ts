import { useEffect, useState } from 'react'

function getFallbackValue<TValue>(fallback: TValue | (() => TValue)) {
  return typeof fallback === 'function' ? (fallback as () => TValue)() : fallback
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function readStoredJson<TValue>(
  key: string,
  fallback: TValue | (() => TValue),
) {
  const fallbackValue = getFallbackValue(fallback)

  if (!canUseStorage()) {
    return fallbackValue
  }

  try {
    const storedValue = window.localStorage.getItem(key)

    if (storedValue === null) {
      return fallbackValue
    }

    return JSON.parse(storedValue) as TValue
  } catch {
    return fallbackValue
  }
}

export function useLocalStorageState<TValue>(
  key: string,
  fallback: TValue | (() => TValue),
) {
  const [value, setValue] = useState<TValue>(() => readStoredJson(key, fallback))

  useEffect(() => {
    if (!canUseStorage()) {
      return
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Ignore quota and serialization failures so math screens keep working.
    }
  }, [key, value])

  return [value, setValue] as const
}
