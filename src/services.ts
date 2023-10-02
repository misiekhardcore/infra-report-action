import fetchUrl from './fetchUrl'
import {SnykIssuesResponse, SnykProjectsResponse} from './snyk'

export const fetchSnykProjects = async (
  organizationId: string,
  token?: string
): Promise<SnykProjectsResponse> => {
  return fetchUrl<SnykProjectsResponse>(
    `https://snyk.io/api/v1/org/${organizationId}/projects`,
    `token ${token}`
  )
}

export const fetchSnykProjectVulnerabilities = async (
  projectId: string,
  organizationId: string,
  token?: string
): Promise<SnykIssuesResponse> => {
  return fetchUrl<SnykIssuesResponse>(
    `https://snyk.io/api/v1/org/${organizationId}/project/${projectId}/aggregated-issues`,
    `token ${token}`,
    'POST'
  )
}
