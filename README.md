<p align="center">
  <a href="https://github.com/actions/typescript-action/actions"><img alt="typescript-action status" src="https://github.com/actions/typescript-action/workflows/build-test/badge.svg"></a>
</p>

# Infra report action

Fast and flexible Github action to gather information from last runs of selected GHA, lists a summary of PRs for matching params, state of ArgoCD environments and Snyk projects vulnerabilities.

Fully configurable with a configuration file. Disable any part of the action by not passing a corresponding token.

## Features

- easy to configure with a configuration file (see example below)
- action output can be send over Slack
- Github, Snyk and/or ArgoCD part of the action can be skiped by not passing a token

## Inputs

This action can be configured with the following inputs:

| Input              | Description                                                                                                                                                                                                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config_file_path` | Path to the configuration file. This file is required for the action to work properly.                                                                                                                                                                                                  |
| `github_token`     | Token to authenticate requests to GitHub. Used to create and label pull requests and to comment. Either `GITHUB_TOKEN` or a repo-scoped [Personal Access Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token) (PAT). |
| `argocd_token`     | Token to authenticate requests to ArgoCD API. Used to get selected environments state.                                                                                                                                                                                                  |
| `snyk_token`       | Token to authenticate requests to Snyk API. Used to get list of vulnerabilities for specified snyk projects.                                                                                                                                                                            |

> **NOTE**
> To disable any part of this action (e.g. GitHub), skip passing the authentication token of the corresponding part.

## Outputs

The following output is generated:

| Output         | Description                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| `infra_report` | Parsed report containing infra information about selected environments. Output is in slack message format. |

## Configuration file

To configure what data we want our report to contain, you have to provide a configuration file.
The struture of this file is the following:

```typescript
{
  github: {
    // Optional custom title to override the default one
    title?: string;
    // Name of the github organization
    organization: string;
    // Name of the repository
    repository: string;
    // Branch for which the workflow runs should be fetched if not overriden in specific workflow
    defaultBranch: string;
    // Array of workflows to be checked and added to the report
    workflows: (
      // Can be just a workflow filename
      | string
      // Or an object if we want to check the workflow for a specific branches
      {
        // Workflow filename
      name: string;
      // List of branches
      branches?: string[];
      }
    )[];
  },
  argoCd: {
    // Optional custom title to override the default one
    title?: string;
    // ArgoCD URL
    url: string;
    // Argo project name for which you want to fetch the environments
    projects: string[];
  },
  snyk: {
    // Optional custom title to override the default one
    title?: string;
    // Version of the snyk API to use, defaults to '2023-05-29'
    apiVersion?: string
    // Snyk organization ID
    organizationId: string;
    // Snyk organization name
    organizationName: string;
    // Which vulnerability levels should be counted and displayed in the report (defaults to ["critical", "high"])
    vulnLevels?: ('critical' | 'high' | 'medium' | 'low')[];
    // A list of CVEs to ignore
    ignoredCVEs?: string[]
    // A list of CWEs to ignore
    ignoredCWEs?: string[]
    // A list of vulnerability ids to ignore
    ignoredVulnIds?: string[]
    // A list of snyk projects
    projects: {
      // Project name
      project: string;
      // Project origin
      origin: string;
      // All the branches/references within a project
      versions: string[];
    }[];
  },
  githubPrs: {
    // Optional custom title to override the default one
    title?: string;
    // Name of the github organization
    organization: string;
    // Name of the repository
    repository: string;
    // list of parameters to fetch matching PRs
    prs: {
      // The PR author
      author?: string
      // The base branch of the PR
      base?: string
      // List of labels
      labels?: string[]
      // PR state ('open' by default)
      state?: 'open' | 'close' | 'all'
      // title for this group of PRs. Defaults to a list of passed params and their values (e.g. author: misiekhardcore state: open labels: [frontend, renovate])
      title?: string
      // The type of result we want to acheive (defaults to 'list)
      // 'list' - lists all PRs as links with title as a label
      // 'count' - shows the number of matching PRs
      resultType?: 'list' | 'count'
    }[]
  }
}
```

### Config file example

```json
{
  "github": {
    "organization": "org",
    "repository": "repo",
    "defaultBranch": "main",
    "workflows": [
      {
        "name": "test",
        "branches": ["main"]
      },
      "check-dist"
    ]
  },
  "argoCd": {
    "url": "https://argocd.com",
    "projects": ["argo-project"]
  },
  "snyk": {
    "title": "some title to override the default",
    "apiVersion": "2023-05029",
    "organizationId": "org-id",
    "organizationName": "org",
    "vulnLevels": ["critical", "high", "medium", "low"],
    "ignoredCVEs": ["CVE-123-4567"],
    "ignoredCWEs": ["CWE-890"],
    "ignoredVulnIds": [
      "snyk:lic:maven:ch.qos.logback:logback-core:(EPL-1.0_OR_LGPL-2.1)"
    ],
    "projects": [
      {
        "project": "project",
        "versions": ["master"],
        "origin": "github"
      }
    ]
  },
  "githubPrs": {
    "organization": "org",
    "repository": "repo",
    "prs": [
      {
        "author": "coolnickname",
        "base": "main",
        "labels": ["feature"],
        "state": "all",
        "title": "This is a title for all PRs in this group",
        "resultType": "list"
      },
      {
        "author": "coolnickname",
        "resultType": "count"
      }
    ]
  }
}
```

## Usage

Create a workflow which passes selected inputs

```yaml
name: 'build-test'
on: # Any trigger you want
  pull_request:
  push:
    branches:
      - main

# These permissions are needed if we want to get access to github workflows
permissions:
  contents: read
  actions: read

jobs:
  infra-report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Get the report
        uses: misiekhardcore/infra-report-action@v1.3.2
        id: get-report
        with:
          # This input is required, without the configuration file the action will throw an error
          config_file_path: ${{ github.workspace }}/.github/workflows/infra-report-config.json
          # Any of these can be skipped if we dont want to include them
          github_token: ${{ secrets.GITHUB_TOKEN }}
          argocd_token: ${{ secrets.ARGOCD_TOKEN }}
          snyk_token: ${{ secrets.SNYK_TOKEN }}

      # As the action output is formatted as a slack message, its suits best to be send via slack
      - name: Send report to slack channel
        uses: slackapi/slack-github-action@v1.24.0
        with:
          channel-id: '#channel'
          slack-message: ${{ steps.get-report.outputs.infra_report }}
        env:
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
```
