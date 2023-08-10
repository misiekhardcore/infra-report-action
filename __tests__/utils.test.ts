import {Service} from '../src/types'
import {capitalize, parseReport} from '../src/utils'

describe('parseReport', () => {
  test('should parse report', async () => {
    const service1 = {
      getResult: () => ({title: 'title1', messages: ['message1']})
    } as unknown as Service
    const service2 = {
      getResult: () => ({title: 'title2', messages: ['message1', 'message2']})
    } as unknown as Service
    const service3 = {
      getResult: () => ({title: 'title2', messages: []})
    } as unknown as Service
    expect(await parseReport([service1, service2, service3])).toBe(
      'title1\nmessage1\ntitle2\nmessage1\nmessage2'
    )
  })
})

describe('capitalize', () => {
  test('should capitalize first letter', () => {
    expect(capitalize('string')).toBe('String')
  })
})
