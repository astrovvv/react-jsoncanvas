# Releasing

GitHub Actions checks pull requests and `main` on Node.js 22 and 24: TypeScript,
lint, tests, library build, example build, and package contents. Coverage is
measured over all library source files, including files not imported by tests.
The HTML report is available as the `coverage` workflow artifact; main-branch
coverage is uploaded to Codecov for the README badge.

## One-time setup

### npm trusted publishing

The package already exists as `@astrov/react-jsoncanvas`. Sign in to npm as a
package maintainer (`astrov`) and open its
[package settings](https://www.npmjs.com/package/@astrov/react-jsoncanvas/access).
Under **Trusted publishing**, add **GitHub Actions** with:

| Field | Value |
| --- | --- |
| Organization or user | `astrovvv` |
| Repository | `react-jsoncanvas` |
| Workflow filename | `publish.yml` |
| Environment name | Leave empty |
| Allowed actions | Enable direct publishing with `npm publish` |

No `NPM_TOKEN` GitHub secret is needed. The publish job uses GitHub's OIDC
identity and npm 11 on Node 24, with provenance enabled. Newly configured
publishers must complete their first publish within npm's activation window
(currently two days); recreate the publisher if it expires before first use.

### Codecov

Sign in to [Codecov with GitHub](https://app.codecov.io/gh/astrovvv), enable
`react-jsoncanvas`, and grant its GitHub integration access if prompted.
Uploads use GitHub OIDC, so no `CODECOV_TOKEN` secret is required.
The coverage badge becomes available after the first successful main-branch
upload. If setup was completed after a failed upload, rerun the failed CI job.

## Publish a release

1. On `main`, update the version in `package.json` and `package-lock.json`,
   commit, and push. `npm version patch --no-git-tag-version` can update both.
2. Wait for the main-branch CI checks to pass.
3. Create and push a tag matching the package version. For version `0.1.7`:

   ```bash
   git tag v0.1.7
   git push origin v0.1.7
   ```

The **Publish npm** workflow verifies the tagged commit, checks that it belongs
to `main` and that the tag matches the package version, then publishes the
package. Stable version tags only are supported. Publishing does not run on
ordinary branch pushes or pull requests.

After the workflow succeeds:

```bash
npm view @astrov/react-jsoncanvas version
```

Each npm version can be published only once. To retry a failed workflow before
publication, rerun it in GitHub Actions rather than moving the release tag.

## Local checks

```bash
npm ci
npm run type-check
npm run type-check:example
npm run lint
npm run test:coverage
npm run build
npm run build:example
npm pack --dry-run
```

## Manual publication and authentication errors

For an interactive local publication:

```bash
npm login --registry=https://registry.npmjs.org
npm whoami --registry=https://registry.npmjs.org
npm publish --access public
```

`prepublishOnly` runs type checking, lint, tests, and the library build.
If publication returns `E404`, first check `npm whoami`: `E401` means the local
authentication is invalid or expired. Sign in again as a package maintainer.
Successful login alone does not grant publishing rights to someone else's scope.
Do not copy npm tokens or the contents of `.npmrc` into issues or CI logs.
