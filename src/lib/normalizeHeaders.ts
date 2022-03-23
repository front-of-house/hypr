export function normalizeHeaders<T>(headers: T): T {
  // @ts-ignore
  const res: T = {}

  for (const h of Object.keys(headers)) {
    // @ts-ignore
    res[h.toLowerCase()] = headers[h]
  }

  return res
}
