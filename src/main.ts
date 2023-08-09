import * as core from '@actions/core'

import {readConfig, parseReport} from './utils'

import ArgoCdService from './argo'
import SnykService from './snyk'
import GithubService from './github'
import {Service} from './types'

async function run(): Promise<void> {
  const githubToken = core.getInput('github_token')
  const argocdToken = core.getInput('argocd_token')
  const snykToken = core.getInput('snyk_token')
  const configFIlePath = core.getInput('config_file_path', {required: true})

  try {
    const config = readConfig(configFIlePath)
    const services: Service[] = []

    if (githubToken) {
      const githubService = new GithubService(githubToken, config)
      services.push(githubService)
    }
    if (argocdToken) {
      const argocdService = new ArgoCdService(argocdToken, config)
      services.push(argocdService)
    }
    if (snykToken) {
      const snykService = new SnykService(snykToken, config)
      services.push(snykService)
    }

    const report = await parseReport(services)
    core.debug(report)
    core.setOutput('infra_report', report)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
