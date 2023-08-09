/*
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. Licensed under a proprietary license.
 * See the License.txt file for more information. You may not use this file
 * except in compliance with the proprietary license.
 */

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
    if (!this.config.argoCd) {
      throw new Error('Argo: config is missing')
    }

    if (!this.config.argoCd.project) {
      throw new Error('Argo: project is missing')
    }
  }

  getResult = async (): Promise<Result> => {
    const {
      argoCd: {project, title = this.title}
    } = this.config

    if (!this.token) {
      return {messages: [], title}
    }

    const applications =
      (await this.fetchArgoCdAplications(project)).items || []

    const messages = applications.map(this.parseMessage)

    return {title, messages}
  }

  private fetchArgoCdAplications = async (
    project: string
  ): Promise<ArgoApplicationsResponse> => {
    return fetchUrl<ArgoApplicationsResponse>(
      `https://argocd.int.camunda.com/api/v1/applications?projects=${project}`,
      `Bearer ${this.token}`
    )
  }

  private parseMessage = (application: ArgoApplication): string => {
    return `${this.getApplicationStatus(
      application
    )} <https://argocd.int.camunda.com/applications/argocd/${
      application.metadata.name
    }|${application.metadata.name}>`
  }

  private getApplicationStatus = (application: ArgoApplication): string => {
    return application.status.health.status === 'Healthy' ? '🟢' : '🔴'
  }
}
