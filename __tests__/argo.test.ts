import {Config} from '../src/types'
import ArgoCdService from '../src/argo'
import fetchUrl from '../src/fetchUrl'

jest.mock('../src/fetchUrl', () => jest.fn())

describe('ArgoCdService', () => {
  const token = 'token'
  const config: Pick<Config, 'argoCd'> = {
    argoCd: {
      url: 'http://argo.com',
      projects: ['project']
    }
  }

  test('should throw an error if config is missing', () => {
    expect(() => new ArgoCdService(token, {} as Config)).toThrow(
      'Argo: config is missing'
    )
  })

  test('should throw an error if url is missing in config', () => {
    expect(() => new ArgoCdService(token, {argoCd: {}} as Config)).toThrow(
      'Argo: api Url is missing'
    )
  })

  test('should throw an error if projects are missing in config', () => {
    expect(
      () => new ArgoCdService(token, {argoCd: {url: 'url'}} as Config)
    ).toThrow('Argo: projects are missing')

    expect(
      () =>
        new ArgoCdService(token, {
          argoCd: {url: 'url', projects: [] as string[]}
        } as Config)
    ).toThrow('Argo: projects are missing')
  })

  test('should give results', async () => {
    ;(fetchUrl as jest.Mock).mockReturnValueOnce({
      items: [
        {status: {health: {status: 'Healthy'}}, metadata: {name: 'name1'}},
        {status: {health: {status: 'Not Healthy'}}, metadata: {name: 'name2'}}
      ]
    })
    const service = new ArgoCdService(token, config as Config)
    const result = await service.getResult()
    expect(result).toEqual({
      messages: [
        '🟢 <http://argo.com/applications/argocd/name1|name1>',
        '🔴 <http://argo.com/applications/argocd/name2|name2>'
      ],
      title: ':argocd: *ArgoCD envs status:*'
    })
  })

  test('should override title', async () => {
    ;(fetchUrl as jest.Mock).mockReturnValueOnce({
      items: [
        {status: {health: {status: 'Healthy'}}, metadata: {name: 'name1'}},
        {status: {health: {status: 'Not Healthy'}}, metadata: {name: 'name2'}}
      ]
    })
    const service = new ArgoCdService(token, {
      argoCd: {...config.argoCd, title: 'new title'}
    } as Config)
    const result = await service.getResult()
    expect(result.title).toEqual("new title")
  })
})
