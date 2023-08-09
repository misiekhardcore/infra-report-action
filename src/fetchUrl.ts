/*
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. Licensed under a proprietary license.
 * See the License.txt file for more information. You may not use this file
 * except in compliance with the proprietary license.
 */

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
