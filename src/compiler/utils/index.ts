export const safeParse = <T>(json: string): T | null => {
  try {
    return JSON.parse(json) as T
  } catch (error) {
    return null
  }
}
