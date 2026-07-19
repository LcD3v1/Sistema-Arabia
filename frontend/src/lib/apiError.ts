interface ApiErrorLike {
  response?: {
    data?: {
      error?: string
    }
  }
}

export function getApiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as ApiErrorLike)?.response?.data
  return data?.error ?? fallback
}
