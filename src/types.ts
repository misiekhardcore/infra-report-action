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
    organization: string
    vulnLevels?: VulnLevel[]
    projects: {
      project: string
      origin: string
      versions: string[]
    }[]
  }
}

export abstract class Service {
  protected token: string | undefined
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
