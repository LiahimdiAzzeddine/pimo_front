import axios from 'axios'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback

  const data = error.response?.data as { error?: { message?: string }; message?: string; errors?: Record<string, string[]> } | undefined
  return data?.error?.message ?? Object.values(data?.errors ?? {})[0]?.[0] ?? data?.message ?? fallback
}
