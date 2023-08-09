import * as core from '@actions/core'

import {readConfig, parseReport} from './utils'

import ArgoCdService from './argo'
import SnykService from './snyk'
import GithubService from './github'

async function run(): Promise<void> {
  const githubToken = core.getInput('github_token') || process.env.GITHUB_TOKEN
  const argocdToken = core.getInput('argocd_token') || process.env.ARGOCD_TOKEN
  const snykToken = core.getInput('snyk_token') || process.env.SNYK_TOKEN
  const configFIlePath = core.getInput('config_file_path') || './config.json'

  try {
    const config = readConfig(configFIlePath)

    const githubService = new GithubService(githubToken, config)
    const snykService = new SnykService(snykToken, config)
    const argocdService = new ArgoCdService(argocdToken, config)

    const ciResults = await githubService.getResult()
    const argocdResults = await argocdService.getResult()
    const snykResults = await snykService.getResult()

    const report = parseReport([ciResults, argocdResults, snykResults])
    core.setOutput('infra_report', report)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
