/*
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. Licensed under a proprietary license.
 * See the License.txt file for more information. You may not use this file
 * except in compliance with the proprietary license.
 */

import fs from 'fs'

import {Config, Result} from './types'

export function readConfig(configFilePath: string): Config {
  const configStream = fs.readFileSync(configFilePath, 'utf8')
  const consigJson = JSON.parse(configStream) as Config
  return consigJson
}

export function parseReport(results: Result[]): string {
  return results.reduce((result, {messages, title}) => {
    if (!messages.length || !title) return result
    return `${result}${title}\n${messages.join('\n')}\n`
  }, '')
}

export function capitalize(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1)
}
