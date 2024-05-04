# Contributing to infra-report action

I welcome contributions for feature requests and bug reports, as well as for docs and code changes.

## Feature requests and bug reports

If you would want to see something added or changed, or encountered a bug.
Please open an [issue on GitHub](https://github.com/misiekhardcore/infra-report-action/issues).

## Docs changes

Saw a typo or want to make other changes to the [README](https://github.com/misiekhardcore/infra-report-action/blob/main/README.md)?
Feel free to open a pull request with your changes.

## Code changes

I welcome code changes.
If you're thinking of opening a large pull request, please consider opening an issue on GitHub first to discuss it.

### Build from source

Install the dependencies.

```
yarn install
```

Apply the automatic formatting to the source code.

```
yarn run format
```

Apply the automatic linting to the source code.

```
yarn run lint
```

Build and package the action for distribution.

```
yarn run build && yarn run package
```

### Testing

Run all tests.

```
yarn test
```

Run all tests in watch mode.

```
yarn run test-watch
```

Shorthand for format, build, package and test.

```
yarn run all
```

### Releases

The distribution is hosted in this repository under `dist`.
Simply build and package the distribution and commit the changes to publish a new snapshot version.

To release a version, run the [Release](https://github.com/misiekhardcore/infra-report-action/actions/workflows/release.yml) workflow from the branch that should be released.
This sets the release version and tags the release commit.
It also creates/moves the major and minor tags (e.g. `v1` and `v1.2`) to the latest corresponding release as [officially recommended](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md).
