export type Result = {
  title: string
  messages: string[]
}

export type VulnLevel = 'critical' | 'high' | 'medium' | 'low'

export type GithubWorkflow =
  | {
      name: string
      branches?: string[]
    }
  | string

export type PRState = 'open' | 'close' | 'all'

export type PRResultType = 'list' | 'count'

export type PRParams = {
  author?: string
  base?: string
  labels?: string[]
  state?: PRState
  title?: string
  resultType?: PRResultType
}

export type Config = {
  github: {
    title?: string
    organization: string
    defaultBranch?: string
    repository: string
    workflows: GithubWorkflow[]
  }
  argoCd: {
    title?: string
    url: string
    projects: string[]
  }
  snyk: {
    title?: string
    apiVersion?: string
    organizationId: string
    organizationName: string
    vulnLevels?: VulnLevel[]
    ignoredCVEs?: string[]
    ignoredCWEs?: string[]
    ignoredVulnIds?: string[]
    projects: {
      project: string
      origin: string
      versions: string[]
    }[]
  }
  githubPrs: {
    title?: string
    organization: string
    repository: string
    prs: PRParams[]
  }
}

export abstract class Service {
  protected token!: string
  protected config!: Config
  protected abstract title: string

  protected consructor(token: string, config: Config): void {
    this.token = token
    this.config = config

    this.validateInputs()
  }

  protected abstract validateInputs(): void

  abstract getResult(): Promise<Result>
}
