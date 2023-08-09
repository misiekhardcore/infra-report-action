import fetch from 'node-fetch'

export default async function fetchUrl<T>(
  url: string,
  authHeader: string
): Promise<T> {
  const response = await fetch(url, {
    headers: {Authorization: authHeader}
  })

  return response.json() as Promise<T>
}
