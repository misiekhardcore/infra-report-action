import {Config} from '../src/types'
import SnykService from '../src/snyk'
import {
  fetchSnykProjectVulnerabilities,
  fetchSnykProjects
} from '../src/services'

const serverities = ['critical', 'high', 'medium', 'low']
jest.mock('../src/services', () => ({
  fetchSnykProjects: jest.fn().mockImplementation(() => ({
    data: [
      {
        id: 1,
        attributes: {
          name: 'version1project1',
          origin: 'origin'
        }
      },
      {
        id: 2,
        attributes: {
          name: 'version1project2',
          origin: 'origin'
        }
      },
      {
        id: 3,
        attributes: {
          name: 'version2project1',
          origin: 'origin'
        }
      },
      {
        id: 4,
        attributes: {
          name: 'version2project2',
          origin: 'origin'
        }
      }
    ]
  })),
  fetchSnykProjectVulnerabilities: jest
    .fn()
    .mockImplementation(async projectId => {
      return {
        issues: [
          {
            issueData: {
              id: '1',
              severity: serverities[projectId - 1]
            }
          },
          {
            issueData: {
              id: '2',
              severity: serverities[-projectId + 1]
            }
          }
        ]
      }
    })
}))

describe('SnykService', () => {
  const token = 'token'
  const config: Pick<Config, 'snyk'> = {
    snyk: {
      organizationId: 'org',
      organizationName: 'org',
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

  test('should throw an error if token is missing', () => {
    expect(() => new SnykService('', {} as Config)).toThrow(
      'Snyk: token is missing'
    )
  })

  test('should throw an error if config is missing', () => {
    expect(() => new SnykService(token, {} as Config)).toThrow(
      'Snyk: config is missing'
    )
  })

  test('should throw an error if organizationId is missing in config', () => {
    expect(() => new SnykService(token, {snyk: {}} as Config)).toThrow(
      'Snyk: organizationId is missing'
    )
  })

  test('should throw an error if organizationName is missing in config', () => {
    expect(
      () => new SnykService(token, {snyk: {organizationId: 'org'}} as Config)
    ).toThrow('Snyk: organizationName is missing')
  })

  test('should throw an error if workflows are missing in config', () => {
    expect(
      () =>
        new SnykService(token, {
          snyk: {organizationId: 'org', organizationName: 'org'}
        } as Config)
    ).toThrow('Snyk: no projects were passed to be checked')

    expect(
      () =>
        new SnykService(token, {
          snyk: {
            organizationId: 'org',
            organizationName: 'org',
            projects: []
          } as Config['snyk']
        } as Config)
    ).toThrow('Snyk: no projects were passed to be checked')
  })

  test('should give results', async () => {
    const service = new SnykService(token, config as Config)
    const result = await service.getResult()
    expect(result).toEqual({
      messages: [
        '<https://app.snyk.io/org/org/reporting?context[page]=issues-detail&project_target=project1&project_origin=github&target_ref=["version1"]&v=1&issue_status=Open&issue_by=Severity&issue_severity=["Critical","High"]|version1: 2 Critical, 0 High>',
        '<https://app.snyk.io/org/org/reporting?context[page]=issues-detail&project_target=project1&project_origin=github&target_ref=["version2"]&v=1&issue_status=Open&issue_by=Severity&issue_severity=["Critical","High"]|version2: 0 Critical, 0 High>',
        '<https://app.snyk.io/org/org/reporting?context[page]=issues-detail&project_target=project2&project_origin=github&target_ref=["version1"]&v=1&issue_status=Open&issue_by=Severity&issue_severity=["Critical","High"]|version1: 0 Critical, 1 High>'
      ],
      title: ':snyk: *Snyk status:*'
    })
  })

  test('should not give results if it didnt find projects', async () => {
    ;(fetchSnykProjects as jest.Mock).mockReturnValueOnce({
      data: []
    })
    const service = new SnykService(token, config as Config)
    const result = await service.getResult()
    expect(result).toEqual({
      messages: [],
      title: ':snyk: *Snyk status:*'
    })
  })

  test('should override title', async () => {
    const service = new SnykService(token, {
      snyk: {...config.snyk, title: 'new title'}
    } as Config)
    const result = await service.getResult()
    expect(result.title).toEqual('new title')
  })

  test('should exclude vulnerabilities by cves', async () => {
    ;(fetchSnykProjects as jest.Mock).mockReturnValueOnce({
      data: [
        {
          attributes: {name: 'project1version1', origin: 'origin'}
        }
      ]
    })
    ;(fetchSnykProjectVulnerabilities as jest.Mock).mockImplementationOnce(
      () => ({
        issues: [
          {
            issueData: {
              severity: 'critical',
              identifiers: {CVE: ['CVE-123']}
            }
          },
          {
            issueData: {
              severity: 'high'
            }
          }
        ]
      })
    )
    const service = new SnykService(token, {
      snyk: {...config.snyk, ignoredCVEs: ['CVE-123']}
    } as Config)
    const result = await service.getResult()
    expect(result).toEqual({
      messages: [
        '<https://app.snyk.io/org/org/reporting?context[page]=issues-detail&project_target=project1&project_origin=github&target_ref=["version1"]&v=1&issue_status=Open&issue_by=Severity&issue_severity=["Critical","High"]|version1: 0 Critical, 1 High>'
      ],
      title: ':snyk: *Snyk status:*'
    })
  })

  test('should exclude vulnerabilities by cwes', async () => {
    ;(fetchSnykProjects as jest.Mock).mockReturnValueOnce({
      data: [
        {
          attributes: {name: 'project1version1', origin: 'origin'}
        }
      ]
    })
    ;(fetchSnykProjectVulnerabilities as jest.Mock).mockImplementationOnce(
      () => ({
        issues: [
          {
            issueData: {
              severity: 'critical',
              identifiers: {CWE: ['CWE-123']}
            }
          },
          {
            issueData: {
              severity: 'high'
            }
          }
        ]
      })
    )
    const service = new SnykService(token, {
      snyk: {...config.snyk, ignoredCWEs: ['CWE-123']}
    } as Config)
    const result = await service.getResult()
    expect(result).toEqual({
      messages: [
        '<https://app.snyk.io/org/org/reporting?context[page]=issues-detail&project_target=project1&project_origin=github&target_ref=["version1"]&v=1&issue_status=Open&issue_by=Severity&issue_severity=["Critical","High"]|version1: 0 Critical, 1 High>'
      ],
      title: ':snyk: *Snyk status:*'
    })
  })

  test('should exclude vulnerabilities by name', async () => {
    ;(fetchSnykProjects as jest.Mock).mockReturnValueOnce({
      data: [
        {
          attributes: {name: 'project1version1', origin: 'origin'}
        }
      ]
    })
    ;(fetchSnykProjectVulnerabilities as jest.Mock).mockImplementationOnce(
      () => ({
        issues: [
          {
            issueData: {
              id: 'some package',
              severity: 'critical'
            }
          },
          {
            issueData: {
              severity: 'high'
            }
          }
        ]
      })
    )
    const service = new SnykService(token, {
      snyk: {...config.snyk, ignoredVulnIds: ['some package']}
    } as Config)
    const result = await service.getResult()
    expect(result).toEqual({
      messages: [
        '<https://app.snyk.io/org/org/reporting?context[page]=issues-detail&project_target=project1&project_origin=github&target_ref=["version1"]&v=1&issue_status=Open&issue_by=Severity&issue_severity=["Critical","High"]|version1: 0 Critical, 1 High>'
      ],
      title: ':snyk: *Snyk status:*'
    })
  })
})
