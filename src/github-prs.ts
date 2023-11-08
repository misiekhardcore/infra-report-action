import * as core from '@actions/core'

import fetchUrl from './fetchUrl'
import {Config, PRParams, Result, Service} from './types'

type Label = {
  name: string
}

type PR = {
  url: string
  user: {login: string}
  labels: Label[]
  title: string
}

export type PRResponse = PR[]

type PRGroup = {
  result: PRResponse
  params: PRParams
}

type FilterFunction<T = unknown> = (project: T) => boolean

export default class GithubPRsService extends Service {
  protected title = ':github: *GH PRs summary:*'

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

    if (!this.config.githubPrs) {
      throw new Error('Github: config is missing')
    }

    if (!this.config.githubPrs.organization) {
      throw new Error('Github: organization is missing')
    }

    if (!this.config.githubPrs.repository) {
      throw new Error('Github: repository is missing')
    }

    if (!this.config.githubPrs.prs || !this.config.githubPrs.prs.length) {
      throw new Error('Github: no prs were passed to be checked')
    }
  }
  getResult = async (): Promise<Result> => {
    const {
      githubPrs: {prs, title = this.title}
    } = this.config

    const fetchedPRs: PRGroup[] = await Promise.all(
      prs.map(async pr => {
        return {result: await this.fetchPRs(pr), params: pr}
      })
    )

    core.debug(JSON.stringify(fetchedPRs))

    const filteredPRs: PRGroup[] = fetchedPRs.map(({params, result}) => ({
      result: result.filter(
        this.handleFilters<PR>([
          this.filterAuthor(params),
          this.filterLabels(params)
        ])
      ),
      params
    }))

    core.debug(JSON.stringify(filteredPRs))

    const messages: string[] = filteredPRs.map(this.parseMessage).flat()

    core.debug(JSON.stringify(messages))

    return {title, messages}
  }

  private fetchPRs = async (pr: PRParams): Promise<PRResponse> => {
    const params = new URLSearchParams({per_page: '100', pulls: 'false'})

    for (const [key, value] of Object.entries(pr)) {
      if (Array.isArray(value)) {
        params.append(key, value.join(','))
      } else {
        params.append(key, value)
      }
    }

    return fetchUrl<PRResponse>(
      `https://api.github.com/repos/${this.config.githubPrs.organization}/${
        this.config.githubPrs.repository
      }/pulls?${params.toString()}`,
      `token ${this.token}`
    )
  }

  private handleFilters =
    <T = unknown>(filters: FilterFunction<T>[]) =>
    (item: T): boolean => {
      return filters.every(filter => filter(item))
    }

  private filterAuthor = ({author}: PRParams): FilterFunction<PR> => {
    return ({user}) => (author !== undefined ? user.login === author : true)
  }

  private filterLabels = (params: PRParams): FilterFunction<PR> => {
    return ({labels}) =>
      !!params.labels &&
      params.labels.every(
        label => !!labels.find(prLabel => prLabel.name === label)
      )
  }

  private parseMessage = ({params, result: prs}: PRGroup): string[] => {
    const result: string[] = []
    const {resultType = 'list', ...rest} = params

    const groupTitle = this.parsePRGroupTitle(rest)
    const groupUrl = this.getUrlForGroup(params)
    const groupTitleWithUrl = `<${groupUrl}|${groupTitle}>`

    if (resultType === 'count') {
      result.push(`${groupTitleWithUrl}: ${prs.length}`)
    } else {
      result.push(`${groupTitleWithUrl}:${!prs.length ? ' 0' : ''}`)

      for (const pr of prs) {
        result.push(this.prToMessage(pr))
      }
    }
    return result
  }

  private parsePRGroupTitle = (params: PRParams): string => {
    const {title, ...rest} = params
    if (title) {
      return title
    }

    return Object.entries(rest)
      .reduce<string[]>((res, [key, value]) => {
        if (value) {
          res.push(
            `${key}: ${Array.isArray(value) ? `[${value.join(', ')}]` : value}`
          )
        }
        return res
      }, [])
      .join(' ')
  }

  private getUrlForGroup = ({
    author,
    base,
    labels,
    state
  }: PRParams): string => {
    const params: string[] = []
    if (state) {
      params.push(`is:${state}`)
    }
    if (author) {
      const [base, suffix] = author.split('[bot]')
      params.push(`author:"${suffix === '' ? 'app/' : ''}${base}"`)
    }
    if (base) {
      params.push(`base:${base}`)
    }
    if (labels?.length) {
      for (const label of labels) {
        params.push(`label:"${label.replace(' ', '+')}"`)
      }
    }
    return `https://github.com/${this.config.githubPrs.organization}/${
      this.config.githubPrs.repository
    }/pulls?q=${encodeURI(params.join('+'))}`
  }

  private prToMessage = ({url, title}: PR): string => {
    return `<${url}|${title}>`
  }
}
