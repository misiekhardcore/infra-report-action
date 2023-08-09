import fs from 'fs'

import {Config, Service} from './types'

export function readConfig(configFilePath: string): Config {
  const configStream = fs.readFileSync(configFilePath, 'utf8')
  const consigJson = JSON.parse(configStream) as Config
  return consigJson
}

export async function parseReport(services: Service[]): Promise<string> {
  const results = await Promise.all(
    services.map(async service => service.getResult())
  )

  return results
    .reduce<string[]>((result, {messages, title}) => {
      if (!messages.length || !title) return result
      result.push(title)
      result.push(messages.join('\n'))
      return result
    }, [])
    .join('\n')
}

export function capitalize(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1)
}
