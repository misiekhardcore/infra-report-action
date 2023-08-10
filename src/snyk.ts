import fetchUrl from './fetchUrl'
import {Config, Result, Service, VulnLevel} from './types'
import {capitalize} from './utils'

type SnykProject = {
  name: string
  origin: string
  issueCountsBySeverity: {
    low: number
    medium: number
    high: number
    critical: number
  }
}

type SnykProjectsResponse = {
  projects: SnykProject[]
}

type SnykSummary = {
  name: string
  vulns: Record<VulnLevel, number>
  url: string
}

export default class SnykService extends Service {
  protected title = ':snyk: *Snyk status:*'
  private readonly defaultVulns: VulnLevel[] = ['critical', 'high']

  constructor(token: string | undefined, config: Config) {
    super()
    this.token = token
    this.config = config

    this.validateInputs()
  }

  protected validateInputs = (): void => {
    if (!this.config.snyk) {
      throw new Error('Snyk: config is missing')
    }

    if (!this.config.snyk.organization) {
      throw new Error('Snyk: organization is missing')
    }

    if (!this.config.snyk.projects || !this.config.snyk.projects.length) {
      throw new Error('Snyk: no projects were passed to be checked')
    }
  }

  getResult = async (): Promise<Result> => {
    const {
      snyk: {projects, title = this.title}
    } = this.config

    if (!this.token) {
      return {messages: [], title}
    }

    const allProjects = (await this.fetchSnykProjects()).projects || []

    const projectSummaries: SnykSummary[] = projects
      .map(({origin, project, versions}) =>
        versions.map<SnykSummary>(version => {
          const filteredProjects = this.filterProjects(
            allProjects,
            version,
            project
          )
          return {
            vulns: this.getProjectVulns(filteredProjects),
            name: version,
            url: this.getProjectUrl(project, version, origin)
          }
        })
      )
      .flat()

    const messages = projectSummaries.map(this.formatResults)

    return {title, messages}
  }

  private fetchSnykProjects = async (): Promise<SnykProjectsResponse> => {
    return fetchUrl<SnykProjectsResponse>(
      `https://snyk.io/api/v1/org/${this.config?.snyk.organization}/projects`,
      `token ${this.token}`
    )
  }

  private filterProjects = (
    projects: SnykProject[],
    name: string,
    project: string
  ): SnykProject[] => {
    return projects.filter(
      ({name: projectName}) =>
        projectName.includes(project) && projectName.includes(name)
    )
  }

  private getProjectVulns = (projects: SnykProject[]): SnykSummary['vulns'] => {
    return projects.reduce<SnykSummary['vulns']>(
      (vulns, {issueCountsBySeverity}) => {
        vulns.critical += issueCountsBySeverity.critical
        vulns.high += issueCountsBySeverity.high
        vulns.medium += issueCountsBySeverity.medium
        vulns.low += issueCountsBySeverity.low
        return vulns
      },
      {high: 0, critical: 0, medium: 0, low: 0}
    )
  }

  private getProjectUrl = (
    project: string,
    version: string,
    origin: string
  ): string => {
    const {vulnLevels = this.defaultVulns} = this.config.snyk
    const vulnsList = vulnLevels.map(capitalize).join('%257C')
    return `https://app.snyk.io/org/${this.config.snyk.organization}/reporting?context%5Bpage%5D=issues-detail&project_target=${project}&project_origin=${origin}&target_ref=${version}&issue_status=Open&issue_by=Severity&table_issues_detail_cols=SCORE%257CCVE%257CCWE%257CPROJECT%257CEXPLOIT%2520MATURITY%257CAUTO%2520FIXABLE%257CINTRODUCED&table_issues_detail_sort=%2520FIRST_INTRODUCED%2520DESC&issue_severity=${vulnsList}`
  }

  private formatResults = (projectSummary: SnykSummary): string => {
    const {vulnLevels = this.defaultVulns} = this.config.snyk
    const {name, vulns, url} = projectSummary
    const result: string[] = []

    for (const level of vulnLevels) {
      result.push(`${vulns[level]} ${capitalize(level)}`)
    }

    return `<${url}|${name}: ${result.join(', ')}>`
  }
}
