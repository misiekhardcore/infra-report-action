import {Config} from '../src/types'
import GithubPrsService from '../src/github-prs'
import fetchUrl from '../src/fetchUrl'

jest.mock('../src/fetchUrl', () => jest.fn())

describe('GithubPrsService', () => {
  const token = 'token'
  const config: Pick<Config, 'githubPrs'> = {
    githubPrs: {
      organization: 'org',
      repository: 'repo',
      prs: [
        {author: 'author', base: 'main', labels: ['label1', 'label2']},
        {title: 'This is a title', resultType: 'count'}
      ]
    }
  }

  test('should throw an error if token is missing', () => {
    expect(() => new GithubPrsService('', {} as Config)).toThrow(
      'Github: token is missing'
    )
  })

  test('should throw an error if config is missing', () => {
    expect(() => new GithubPrsService(token, {} as Config)).toThrow(
      'Github: config is missing'
    )
  })

  test('should throw an error if organization is missing in config', () => {
    expect(
      () => new GithubPrsService(token, {githubPrs: {}} as Config)
    ).toThrow('Github: organization is missing')
  })

  test('should throw an error if repository is missing in config', () => {
    expect(
      () =>
        new GithubPrsService(token, {
          githubPrs: {organization: 'org'}
        } as Config)
    ).toThrow('Github: repository is missing')
  })

  test('should throw an error if prs are missing in config', () => {
    expect(
      () =>
        new GithubPrsService(token, {
          githubPrs: {organization: 'org', repository: 'repo'}
        } as Config)
    ).toThrow('Github: no prs were passed to be checked')

    expect(
      () =>
        new GithubPrsService(token, {
          githubPrs: {
            organization: 'org',
            repository: 'repo',
            prs: [] as string[]
          } as Config['githubPrs']
        } as Config)
    ).toThrow('Github: no prs were passed to be checked')
  })

  test('should give results', async () => {
    ;(fetchUrl as jest.Mock).mockReturnValue([
      {
        url: 'example.com',
        title: 'This is an awesome feature PR',
        user: {login: 'author'},
        labels: [{name: 'label1'}, {name: 'label2'}]
      }
    ])
    const service = new GithubPrsService(token, config as Config)
    const result = await service.getResult()
    expect(result).toEqual({
      messages: [
        '<https://github.com/org/repo/pulls?q=author:%22author%22+base:main+label:%22label1%22+label:%22label2%22|author: author base: main labels: [label1, label2]>:',
        '<example.com|This is an awesome feature PR>',
        '<https://github.com/org/repo/pulls?q=|This is a title>: 0'
      ],
      title: ':github: *GH PRs summary:*'
    })
  })

  test('should override title', async () => {
    ;(fetchUrl as jest.Mock).mockReturnValueOnce([
      {
        url: 'example.com',
        title: 'This is an awesome feature PR',
        user: {login: 'author'},
        labels: [{name: 'label1'}, {name: 'label2'}]
      }
    ])
    const service = new GithubPrsService(token, {
      githubPrs: {...config.githubPrs, title: 'new title'}
    } as Config)
    const result = await service.getResult()
    expect(result.title).toEqual('new title')
  })
})
