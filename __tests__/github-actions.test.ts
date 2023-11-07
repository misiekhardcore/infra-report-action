import {Config} from '../src/types'
import GithubActionsService from '../src/github-actions'
import fetchUrl from '../src/fetchUrl'

jest.mock('../src/fetchUrl', () => jest.fn())

describe('GithubActionsService', () => {
  const token = 'token'
  const config: Pick<Config, 'github'> = {
    github: {
      organization: 'org',
      repository: 'repo',
      workflows: [{name: 'workflow1', branches: ['main']}, 'workflow2']
    }
  }

  test('should throw an error if token is missing', () => {
    expect(() => new GithubActionsService('', {} as Config)).toThrow(
      'Github: token is missing'
    )
  })

  test('should throw an error if config is missing', () => {
    expect(() => new GithubActionsService(token, {} as Config)).toThrow(
      'Github: config is missing'
    )
  })

  test('should throw an error if organization is missing in config', () => {
    expect(
      () => new GithubActionsService(token, {github: {}} as Config)
    ).toThrow('Github: organization is missing')
  })

  test('should throw an error if repository is missing in config', () => {
    expect(
      () =>
        new GithubActionsService(token, {
          github: {organization: 'org'}
        } as Config)
    ).toThrow('Github: repository is missing')
  })

  test('should throw an error if workflows are missing in config', () => {
    expect(
      () =>
        new GithubActionsService(token, {
          github: {organization: 'org', repository: 'repo'}
        } as Config)
    ).toThrow('Github: no workflows were passed to be checked')

    expect(
      () =>
        new GithubActionsService(token, {
          github: {
            organization: 'org',
            repository: 'repo',
            workflows: [] as string[]
          }
        } as Config)
    ).toThrow('Github: no workflows were passed to be checked')
  })

  test('should give results', async () => {
    ;(fetchUrl as jest.Mock).mockImplementation((url: string) => {
      const isFirst = url.includes('workflow1')
      return {
        workflow_runs: [
          {
            html_url: 'url',
            name: isFirst ? 'name1' : 'name2',
            head_branch: 'main',
            status: 'completed',
            conclusion: isFirst ? 'success' : 'failure'
          }
        ]
      }
    })
    const service = new GithubActionsService(token, config as Config)
    const result = await service.getResult()
    expect(result).toEqual({
      messages: ['🟢 <url|name1 (main)>', '🔴 <url|name2 (main)>'],
      title: ':github: *GH actions status:*'
    })
  })

  test('should override title', async () => {
    ;(fetchUrl as jest.Mock).mockReturnValueOnce({
      workflow_runs: [
        {
          html_url: 'url',
          name: 'name',
          head_branch: 'main',
          status: 'completed',
          conclusion: 'failure'
        }
      ]
    })
    const service = new GithubActionsService(token, {
      github: {...config.github, title: 'new title'}
    } as Config)
    const result = await service.getResult()
    expect(result.title).toEqual('new title')
  })

  test('should use default branch if specified', async () => {
    const service = new GithubActionsService(token, {
      github: {...config.github, defaultBranch: 'main'}
    } as Config)
    await service.getResult()
    expect(fetchUrl).toHaveBeenCalledWith(
      'https://api.github.com/repos/org/repo/actions/workflows/workflow1.yml/runs?branch=main',
      'token token'
    )
  })
})
