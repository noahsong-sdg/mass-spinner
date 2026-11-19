# Deploying verified releases

The workflow requires repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`; local Wrangler OAuth is not an Actions credential. Run **Deploy verified artifact** from the current trusted workflow revision. It deploys a selected successful **Verify** run without rebuilding its site. Its manifest must match that run’s source revision and source lockfile.

```sh
gh workflow run deploy.yml -f verify_run_id=NEXT_VERIFY_RUN -f previous_deploy_run_id=CURRENT_DEPLOY_RUN
```

Use the successful Deploy run that actually owns the current live manifest. The workflow rejects stale selections, verifies every file, and retains its prepared hashed JS/CSS/Wasm chunks across successive deployments. Old HTML and unhashed data are never carried forward. `prepared-site` artifacts persist for 90 days. Production deployments are serialized.

The selected Verify run supplies version-specific feature/physics qualification. After publication, Deploy checks the exact manifest and SHA256 of **every served file**. Root `_redirects` and `_headers` are [Cloudflare deployment controls](https://developers.cloudflare.com/workers/static-assets/redirects/), not HTTP assets: their bytes remain locally hash-verified, and bootstrap restores them exclusively from the already verified base. Each literal same-origin 301 redirect is checked without following it; unsupported rule formats fail explicitly. If `_headers` is present, its deployed header behavior remains unqualified. Deploy then runs only `e2e/deployment-health.spec.ts` on desktop and phone: canvas, current control, plots and overflow. It does not apply newer tutorial/feature assertions to an older rollback artifact.

Rollback uses the same command with an older `verify_run_id` and the **currently live** `previous_deploy_run_id`. Current release tooling admits the older artifact; the rollback preserves chunks needed by tabs from newer releases. The selected Verify run’s `verified-site` artifact must still exist (currently retained for 7 days).

A push touching `deploy.yml` registers the workflow on a feature branch but skips the entire Deploy job. Only an explicit dispatch prepares or publishes a release. The `prepared-site` artifact is uploaded before the credentialed publication step; a failed publication does not qualify that run as a normal `previous_deploy_run_id`. An authorized manual publication from that artifact needs a fresh explicit bootstrap on the next Actions deployment.

## First deployment after a manual release

A manual deployment has no `prepared-site` workflow artifact. Bootstrap it explicitly once using its original successful Verify run and a trusted SHA256 of its **prepared** manifest:

```sh
gh workflow run deploy.yml -f verify_run_id=NEXT_VERIFY_RUN \
  -f bootstrap_verify_run_id=CURRENT_MANUAL_VERIFY_RUN \
  -f bootstrap_manifest_sha256=TRUSTED_PREPARED_MANIFEST_SHA256
```

Historical migration receipt: Verify run `44491090872`, source `45588450bf35cb9abc4e3472ff6f30bf9b00d459`, 370 files in `/private/tmp/mass-spinner-docs-4558845-deploy/release`, manifest SHA256 `955f37a4ace03370b40686a75fa19df7d15f8e5c08b4f095b802408641fa2cb1`. These inputs are valid only while that exact tree is live. Every later manual publication needs its own qualified Verify run and trusted prepared-manifest digest.

The bootstrap downloads the pinned manifest, checks every original qualified file and source/lock/runtime identity, admits additional hashed chunks only, and verifies downloaded bytes before offline retention. It never guesses a previous release or trusts an unpinned live manifest.

After that deployment succeeds, use its Deploy run ID normally. If deployment reaches Cloudflare but subsequent live checks fail, do not reuse a stale prior run: inspect the actual live tree and explicitly bootstrap its qualified source and independently verified prepared-manifest digest. Deployment credentials are available only to Wrangler; artifact verification and bootstrap do not receive them.
