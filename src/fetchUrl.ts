import fetch from 'node-fetch'

export default async function fetchUrl<T>(
  url: string,
  authHeader: string,
  method = 'GET'
): Promise<T> {
  const response = await fetch(url, {
    headers: {Authorization: authHeader},
    method
  })

  return response.json() as Promise<T>
}
