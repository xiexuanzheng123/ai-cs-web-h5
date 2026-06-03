export interface ApiErrorPayload {
  code?: string
  error?: string
}

export async function readApiError(response: Response, fallback: string): Promise<Error> {
  try {
    const payload = (await response.json()) as ApiErrorPayload
    if (payload.error) {
      return new Error(payload.error)
    }
  } catch {
    // Ignore non-JSON error responses and use the fallback below.
  }
  return new Error(`${fallback}：${response.status}`)
}
