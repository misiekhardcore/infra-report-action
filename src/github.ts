import fetchUrl from './fetchUrl'
import {Result, Config, Service, GithubWorkflow} from './types'

type Run = {
  html_url: string
  name: string
  head_branch: string
  status: string
  conclusion: string
}

type CiResponse = {
  workflow_runs: Run[]
}

export default class GithubService extends Service {
  protected title = ':github: *GH actions status:*'

  constructor(token: string | undefined, config: Config) {
    super()
    this.token = token
    this.config = config

    this.validateInputs()
  }

  protected validateInputs = (): void => {
    if (!this.token) {
      throw new Error('Github: token is missing')
    }

    if (!this.config.github) {
      throw new Error('Github: config is missing')
    }

    if (!this.config.github.organization) {
      throw new Error('Github: organization is missing')
    }

    if (!this.config.github.repository) {
      throw new Error('Github: repository is missing')
    }

    if (!this.config.github.workflows || !this.config.github.workflows.length) {
      throw new Error('Github: no workflows were passed to be checked')
    }
  }

  getResult = async (): Promise<Result> => {
    const {
      github: {workflows, title = this.title}
    } = this.config

    if (!this.token) {
      return {messages: [], title}
    }

    const workflowRuns = await this.getWorkflowRuns(workflows)

    const lastCompletedRuns = this.getLastCompletedWorkflowRuns(workflowRuns)

    const messages = lastCompletedRuns.map(this.parseMessage)

    return {title, messages}
  }

  private getWorkflowRuns = async (
    workflows: GithubWorkflow[]
  ): Promise<CiResponse[]> => {
    const promises: Promise<CiResponse>[] = []
    for (const workflow of workflows) {
      if (typeof workflow === 'string') {
        promises.push(this.fetchWorkflow(workflow))
      } else {
        const {name, branches} = workflow
        if (branches) {
          for (const branch of branches) {
            promises.push(this.fetchWorkflow(name, branch))
          }
        } else {
          promises.push(this.fetchWorkflow(name))
        }
      }
    }

    return Promise.all(promises)
  }

  private fetchWorkflow = async (
    workflow: string,
    branch?: string
  ): Promise<CiResponse> => {
    return fetchUrl<CiResponse>(
      `https://api.github.com/repos/${this.config.github.organization}/${
        this.config.github.repository
      }/actions/workflows/${workflow}.yml/runs${
        branch ? `?branch=${branch}` : ''
      }`,
      `token ${this.token}`
    )
  }

  private getLastCompletedWorkflowRuns = (
    workflowRuns: CiResponse[]
  ): Run[] => {
    return workflowRuns
      .map(
        workflow =>
          workflow.workflow_runs?.find(run => run.status !== 'in_progress')
      )
      .filter((run): run is Run => run !== undefined)
  }

  private parseMessage = (run: Run): string => {
    return `${this.isRunSuccessful(run) ? '🟢' : '🔴'} <${run.html_url}|${
      run.name
    } (${run.head_branch})>`
  }

  private isRunSuccessful = (run: Run): boolean => {
    return run.status === 'completed' && run.conclusion === 'success'
  }
}
