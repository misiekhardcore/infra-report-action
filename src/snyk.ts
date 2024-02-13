import * as core from '@actions/core'

import {fetchSnykProjectVulnerabilities, fetchSnykProjects} from './services'
import {Config, Result, Service, VulnLevel} from './types'
import {capitalize} from './utils'

type SnykProject = {
  id: string
  attributes: {
    name: string
    origin: string
    issueCountsBySeverity: {
      low: number
      medium: number
      high: number
      critical: number
    }
  }
}

export type SnykProjectsResponse = {
  data: SnykProject[]
}

type SnykIssue = {
  issueType: string
  issueData: {
    id: string
    title: string
    severity?: VulnLevel
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
  issues: (SnykIssue | undefined)[]
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

const SNYK_API_VERSION = '2023-05-29'

export default class SnykService extends Service {
  protected title = ':snyk: *Snyk status:*'
  private readonly defaultVulns: VulnLevel[] = ['critical', 'high']

  constructor(token: string, config: Config) {
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

    if (!this.config.snyk.organizationId) {
      throw new Error('Snyk: organizationId is missing')
    }

    if (!this.config.snyk.organizationName) {
      throw new Error('Snyk: organizationName is missing')
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
      (
        await fetchSnykProjects(
          this.config.snyk.organizationId,
          this.token,
          this.config.snyk.apiVersion || SNYK_API_VERSION
        )
      ).data || []

    const allProjectsWithVulns = await Promise.all(
      allProjects.map<Promise<SnykProjectWithIssues>>(async project => ({
        ...project,
        issues: await this.getFilteredVulnerabilities(project)
      }))
    )

    core.debug(JSON.stringify(allProjects))

    const filteredProjects = allProjectsWithVulns.filter(
      this.handleFilters([this.filterProjectsFromConfig(projects)])
    )

    core.debug(JSON.stringify(filteredProjects))

    const groupedProjects = this.groupByProjectAndVersion(
      projects,
      filteredProjects
    )

    core.debug(JSON.stringify(groupedProjects))

    const projectSummaries: SnykSummary[] = groupedProjects
      .filter(({projects}) => !!projects.length)
      .map(this.getSummaryForProjectGroup)
      .filter((project): project is SnykSummary => project !== undefined)

    core.debug(JSON.stringify(projectSummaries))

    const messages = projectSummaries.map(this.formatResults)

    core.debug(JSON.stringify(messages))

    return {title, messages}
  }

  private getFilteredVulnerabilities = async (
    project: SnykProject
  ): Promise<SnykIssue[]> => {
    const {issues} = await fetchSnykProjectVulnerabilities(
      project.id,
      this.config.snyk.organizationName,
      this.token
    )

    return issues
      .filter((issue): issue is SnykIssue => typeof issue !== 'undefined')
      .filter(
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
    ({attributes: {name: projectName}}) =>
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
            ({attributes: {name}}) =>
              name.includes(project) && name.includes(version)
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
          if (!issue?.issueData.severity) continue
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
    const vulnsList = vulnLevels
      .map(capitalize)
      .map(vuln => `"${vuln}"`)
      .join(',')
    return `https://app.snyk.io/org/${this.config.snyk.organizationName}/reporting?context[page]=issues-detail&project_target=${project}&project_origin=${origin}&target_ref=["${version}"]&v=1&issue_status=Open&issue_by=Severity&issue_severity=[${vulnsList}]`
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
