import fetchUrl from './fetchUrl'
import {Config, Result, Service} from './types'

type ArgoApplication = {
  status: {health: {status: string}}
  metadata: {name: string}
}

type ArgoApplicationsResponse = {
  items: ArgoApplication[]
}

export default class ArgoCdService extends Service {
  protected title = ':argocd: *ArgoCD envs status:*'

  constructor(token: string | undefined, config: Config) {
    super()
    this.token = token
    this.config = config

    this.validateInputs()
  }

  protected validateInputs = (): void => {
    if (!this.token) {
      throw new Error('Argo: token is missing')
    }

    if (!this.config.argoCd) {
      throw new Error('Argo: config is missing')
    }

    if (!this.config.argoCd.url) {
      throw new Error('Argo: api Url is missing')
    }

    if (!this.config.argoCd.projects || !this.config.argoCd.projects.length) {
      throw new Error('Argo: projects are missing')
    }
  }

  getResult = async (): Promise<Result> => {
    const {
      argoCd: {projects, title = this.title}
    } = this.config

    if (!this.token) {
      return {messages: [], title}
    }

    const applications = (
      await Promise.all(
        projects.map(
          async project =>
            (await this.fetchArgoCdAplications(project)).items || []
        )
      )
    ).flat()

    const messages = applications.map(this.parseMessage)

    return {title, messages}
  }

  private fetchArgoCdAplications = async (
    project: string
  ): Promise<ArgoApplicationsResponse> => {
    return fetchUrl<ArgoApplicationsResponse>(
      `${this.config.argoCd.url}/api/v1/applications?projects=${project}`,
      `Bearer ${this.token}`
    )
  }

  private parseMessage = (application: ArgoApplication): string => {
    return `${this.getApplicationStatus(application)} <${
      this.config.argoCd.url
    }/applications/argocd/${application.metadata.name}|${
      application.metadata.name
    }>`
  }

  private getApplicationStatus = (application: ArgoApplication): string => {
    return application.status.health.status === 'Healthy' ? '🟢' : '🔴'
  }
}
