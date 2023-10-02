import {fetchSnykProjectVulnerabilities, fetchSnykProjects} from './services'
import {Config, Result, Service, VulnLevel} from './types'
import {capitalize} from './utils'

type SnykProject = {
  id: string
  name: string
  origin: string
  issueCountsBySeverity: {
    low: number
    medium: number
    high: number
    critical: number
  }
}

export type SnykProjectsResponse = {
  projects: SnykProject[]
}

type SnykIssue = {
  issueType: string
  issueData: {
    id: string
    title: string
    severity: VulnLevel
    identifiers?: {
      CWE?: string[]
      CVE?: string[]
    }
  }
  isPatched: boolean
  isIgnored: boolean
}

type SnykProjectWithIssues = SnykProject & Partial<SnykIssuesResponse>

export type SnykIssuesResponse = {
  issues: SnykIssue[]
}

type SnykSummary = {
  name: string
  vulns: Record<VulnLevel, number>
  url: string
}

type FilterFunction<T = unknown> = (project: T) => boolean

type ProjectsGroup = {
  version: string
  project: string
  origin: string
  projects: SnykProjectWithIssues[]
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
    if (!this.token) {
      throw new Error('Snyk: token is missing')
    }

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

    const allProjects =
      (await fetchSnykProjects(this.config.snyk.organization, this.token))
        .projects || []

    const allProjectsWithVulns = await Promise.all(
      allProjects.map<Promise<SnykProjectWithIssues>>(async project => ({
        ...project,
        issues: await this.getFilteredVulnerabilities(project)
      }))
    )

    const filteredProjects = allProjectsWithVulns.filter(
      this.handleFilters([this.filterProjectsFromConfig(projects)])
    )

    const groupedProjects = this.groupByProjectAndVersion(
      projects,
      filteredProjects
    )

    const projectSummaries: SnykSummary[] = groupedProjects
      .filter(({projects}) => !!projects.length)
      .map(this.getSummaryForProjectGroup)
      .filter((project): project is SnykSummary => project !== undefined)

    const messages = projectSummaries.map(this.formatResults)

    return {title, messages}
  }

  private getFilteredVulnerabilities = async (
    project: SnykProject
  ): Promise<SnykIssue[]> => {
    const {issues} = await fetchSnykProjectVulnerabilities(
      project.id,
      this.config.snyk.organization,
      this.token
    )

    return issues.filter(
      this.handleFilters([
        this.filterPatchedIgnored,
        this.filterCves(this.config.snyk.ignoredCVEs),
        this.filterCwes(this.config.snyk.ignoredCWEs),
        this.filterVulnIds(this.config.snyk.ignoredVulnIds)
      ])
    )
  }

  private filterPatchedIgnored: FilterFunction<SnykIssue> = ({
    isIgnored,
    isPatched
  }) => !isIgnored && !isPatched

  private filterCves =
    (ignoredCves?: string[]): FilterFunction<SnykIssue> =>
    issue =>
      !ignoredCves?.some(cve => issue.issueData.identifiers?.CVE?.includes(cve))

  private filterCwes =
    (ignoredCwes?: string[]): FilterFunction<SnykIssue> =>
    issue =>
      !ignoredCwes?.some(cwe => issue.issueData.identifiers?.CWE?.includes(cwe))

  private filterVulnIds =
    (ignoredVulnIds?: string[]): FilterFunction<SnykIssue> =>
    issue =>
      !ignoredVulnIds?.some(name => issue.issueData.id === name)

  private handleFilters =
    <T = unknown>(filters: FilterFunction<T>[]) =>
    (item: T): boolean => {
      return filters.every(filter => filter(item))
    }

  private filterProjectsFromConfig =
    (configProjects: Config['snyk']['projects']): FilterFunction<SnykProject> =>
    ({name: projectName}) =>
      configProjects.some(({project, versions}) =>
        versions.some(
          version =>
            projectName.includes(project) && projectName.includes(version)
        )
      )

  private groupByProjectAndVersion = (
    configProjects: Config['snyk']['projects'],
    projects: SnykProjectWithIssues[]
  ): ProjectsGroup[] =>
    configProjects.reduce<ProjectsGroup[]>(
      (result, {origin, project, versions}) => {
        for (const version of versions) {
          const projectsForVersion = projects.filter(
            ({name}) => name.includes(project) && name.includes(version)
          )
          result.push({
            origin,
            project,
            version,
            projects: projectsForVersion
          })
        }
        return result
      },
      []
    )

  private getSummaryForProjectGroup = ({
    origin,
    project,
    projects,
    version
  }: ProjectsGroup): SnykSummary => ({
    vulns: this.getProjectVulns(projects),
    name: version,
    url: this.getProjectUrl(project, version, origin)
  })

  private getProjectVulns = (
    projects: SnykProjectWithIssues[]
  ): SnykSummary['vulns'] => {
    return projects.reduce<SnykSummary['vulns']>(
      (vulns, {issues = []}) => {
        for (const issue of issues) {
          const {
            issueData: {severity}
          } = issue
          vulns[severity]++
        }
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
