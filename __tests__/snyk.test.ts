import {Config} from '../src/types'
import SnykService from '../src/snyk'
import fetchUrl from '../src/fetchUrl'

jest.mock('../src/fetchUrl', () => jest.fn())

describe('SnykService', () => {
  const token = 'token'
  const config: Pick<Config, 'snyk'> = {
    snyk: {
      organization: 'org',
      projects: [
        {
          origin: 'github',
          project: 'project1',
          versions: ['version1', 'version2']
        },
        {
          origin: 'github',
          project: 'project2',
          versions: ['version1']
        }
      ]
    }
  }

  test('should throw an error if config is missing', () => {
    expect(() => new SnykService(token, {} as Config)).toThrow(
      'Snyk: config is missing'
    )
  })

  test('should throw an error if organization is missing in config', () => {
    expect(() => new SnykService(token, {snyk: {}} as Config)).toThrow(
      'Snyk: organization is missing'
    )
  })

  test('should throw an error if workflows are missing in config', () => {
    expect(
      () =>
        new SnykService(token, {
          snyk: {organization: 'org'}
        } as Config)
    ).toThrow('Snyk: no projects were passed to be checked')

    expect(
      () =>
        new SnykService(token, {
          snyk: {
            organization: 'org',
            projects: []
          } as Config['snyk']
        } as Config)
    ).toThrow('Snyk: no projects were passed to be checked')
  })

  test('should give results', async () => {
    ;(fetchUrl as jest.Mock).mockReturnValueOnce({
      projects: [
        {
          name: 'version1project1',
          origin: 'origin',
          issueCountsBySeverity: {
            low: 1,
            medium: 1,
            high: 1,
            critical: 1
          }
        },
        {
          name: 'version1project2',
          origin: 'origin',
          issueCountsBySeverity: {
            low: 2,
            medium: 2,
            high: 2,
            critical: 2
          }
        },
        {
          name: 'version2project1',
          origin: 'origin',
          issueCountsBySeverity: {
            low: 3,
            medium: 3,
            high: 3,
            critical: 3
          }
        },
        {
          name: 'version2project2',
          origin: 'origin',
          issueCountsBySeverity: {
            low: 4,
            medium: 4,
            high: 4,
            critical: 4
          }
        }
      ]
    })
    const service = new SnykService(token, config as Config)
    const result = await service.getResult()
    expect(result).toEqual({
      messages: [
        '<https://app.snyk.io/org/org/reporting?context%5Bpage%5D=issues-detail&project_target=project1&project_origin=github&target_ref=version1&issue_status=Open&issue_by=Severity&table_issues_detail_cols=SCORE%257CCVE%257CCWE%257CPROJECT%257CEXPLOIT%2520MATURITY%257CAUTO%2520FIXABLE%257CINTRODUCED&table_issues_detail_sort=%2520FIRST_INTRODUCED%2520DESC&issue_severity=Critical%257CHigh|version1: 1 Critical, 1 High>',
        '<https://app.snyk.io/org/org/reporting?context%5Bpage%5D=issues-detail&project_target=project1&project_origin=github&target_ref=version2&issue_status=Open&issue_by=Severity&table_issues_detail_cols=SCORE%257CCVE%257CCWE%257CPROJECT%257CEXPLOIT%2520MATURITY%257CAUTO%2520FIXABLE%257CINTRODUCED&table_issues_detail_sort=%2520FIRST_INTRODUCED%2520DESC&issue_severity=Critical%257CHigh|version2: 3 Critical, 3 High>',
        '<https://app.snyk.io/org/org/reporting?context%5Bpage%5D=issues-detail&project_target=project2&project_origin=github&target_ref=version1&issue_status=Open&issue_by=Severity&table_issues_detail_cols=SCORE%257CCVE%257CCWE%257CPROJECT%257CEXPLOIT%2520MATURITY%257CAUTO%2520FIXABLE%257CINTRODUCED&table_issues_detail_sort=%2520FIRST_INTRODUCED%2520DESC&issue_severity=Critical%257CHigh|version1: 2 Critical, 2 High>'
      ],
      title: ':snyk: *Snyk status:*'
    })
  })

  test('should not give results if it didnt find projects', async () => {
    ;(fetchUrl as jest.Mock).mockReturnValueOnce({
      projects: []
    })
    const service = new SnykService(token, config as Config)
    const result = await service.getResult()
    expect(result).toEqual({
      messages: [],
      title: ':snyk: *Snyk status:*'
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
    const service = new SnykService(token, {
      snyk: {...config.snyk, title: 'new title'}
    } as Config)
    const result = await service.getResult()
    expect(result.title).toEqual('new title')
  })
})
