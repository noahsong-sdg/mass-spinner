# Release deployment

The workflow uses repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Local Wrangler OAuth does not give credentials to Actions.

Use **Deploy verified artifact** from the trusted revision of `deploy.yml` for this deployment. Select a **Verify** run with `conclusion: success`. The workflow publishes its site without another build. The manifest shows file hashes. Its source revision and lockfile must agree with the selected run.

```sh
gh workflow run deploy.yml -f verify_run_id=NEXT_VERIFY_RUN -f previous_deploy_run_id=CURRENT_DEPLOY_RUN
```

For `previous_deploy_run_id`, use the Deploy run with `conclusion: success` for the live manifest. The workflow rejects a different manifest. It compares each file with its hash. It keeps prepared JS/CSS/Wasm chunks with hash filenames across deployments. It does not keep old HTML or data without hash filenames.

`prepared-site` artifacts stay available for 90 days. Production deployments occur one at a time.

The selected Verify run contains that version's feature and physics qualification. After publication, Deploy compares the manifest bytes and SHA256 of each file that the site serves.

Root `_redirects` and `_headers` are [Cloudflare deployment controls](https://developers.cloudflare.com/workers/static-assets/redirects/). The site does not serve them as HTTP assets. Their local hashes must agree with the verified base. The bootstrap procedure restores them only from that base.

The workflow examines each literal same-origin 301 redirect. For this check, it does not request the redirect destination. It stops with an error for unsupported rule formats. The workflow has no test for the deployed header behavior of `_headers`.

Deploy then uses `e2e/deployment-health.spec.ts` for desktop and phone checks of the canvas, current control, plots, and page overflow. It does not use newer tutorial or feature assertions during rollback.

For rollback, use the same command with an older `verify_run_id` and the live `previous_deploy_run_id`. The release tools accept that artifact and keep chunks necessary for tabs from newer releases. The selected run must still have its `verified-site` artifact, which stays available for 7 days.

A push that changes `deploy.yml` registers the branch workflow. It does not start the Deploy job. Only an explicit dispatch prepares or publishes a release. The workflow uploads `prepared-site` before the publication step that uses credentials.

If publication fails, do not use that run as a normal `previous_deploy_run_id`. After approved manual publication from it, use a new bootstrap procedure for the next Actions deployment.

## First deployment after a manual release

A manual deployment has no `prepared-site` workflow artifact. For its first Actions deployment, use that release's Verify run with `conclusion: success` and the trusted prepared-manifest SHA256:

```sh
gh workflow run deploy.yml -f verify_run_id=NEXT_VERIFY_RUN \
  -f bootstrap_verify_run_id=CURRENT_MANUAL_VERIFY_RUN \
  -f bootstrap_manifest_sha256=TRUSTED_PREPARED_MANIFEST_SHA256
```

Historical migration receipt:

- Verify run: `44491090872`
- Source: `45588450bf35cb9abc4e3472ff6f30bf9b00d459`
- Files: 370 in `/private/tmp/mass-spinner-docs-4558845-deploy/release`
- Manifest SHA256: `955f37a4ace03370b40686a75fa19df7d15f8e5c08b4f095b802408641fa2cb1`.

These inputs are applicable only while that same file tree is live. Each later manual publication must have its own qualified Verify run and trusted prepared-manifest hash.

The bootstrap downloads the manifest with the specified hash. It examines each qualified base file and source, lockfile, and runtime identity. It accepts only chunks with hash filenames as additional files. It compares downloaded bytes with their hashes before offline retention. It does not select a previous release automatically or accept a live manifest without a specified hash.

After a deployment with `conclusion: success`, use its Deploy run ID for later deployments. If Cloudflare receives a deployment but live checks fail, examine the actual live file tree. Use its qualified source and independently verified prepared-manifest hash for a new bootstrap procedure.

Only Wrangler receives deployment credentials. Artifact verification and the bootstrap procedure do not receive these credentials.
