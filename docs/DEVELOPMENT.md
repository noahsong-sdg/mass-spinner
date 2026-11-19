# Development

The full checkout retains scientific evidence and exceeds safe-dev's 512 MiB input limit. `scripts/dev-snapshot.py` copies the maintained web build/test inputs into a separate directory. It leaves the checkout, historical campaigns and Git history untouched.

The reviewed allowlist is in the script: application source, tools, tests, docs, web assets, Blender inputs and the scientific fixtures read by the web test suite. It includes tracked files and non-ignored new files within those paths; credentials and symlinks are refused or excluded. It does **not** support rerunning every historical scientific campaign.

## Prepare an isolated workspace

Run only source preparation on the host; execute dependencies, tests and builds in the guest. Use a new destination:

```sh
python3 scripts/dev-snapshot.py /private/tmp/mass-spinner-dev-inputs
python3 scripts/dev-snapshot.py /private/tmp/mass-spinner-dev-inputs --verify
safe-dev -C /private/tmp/mass-spinner-dev-inputs --memory 1G init
```

`dev-inputs.json` records every input's size and SHA256, the package-lock SHA256 and the original base commit. Save the printed manifest SHA256 with verification results. Verification requires an exact file inventory and refuses added source, tests, secrets or symlinks. Run it before creating `.git`, `node_modules` or build output; it deliberately has no post-install exclusions. Working-tree changes are represented by their actual file hashes; the base commit alone does not identify those changes. Regenerate the snapshot after editing source; it is an immutable input set, not a live mount.

The current safe-dev image has Node 22; this project requires Node 26.13.1 / npm 11.20.0. Install the official ARM64 distribution inside the guest (use `linux-x64` on an x86 guest):

```sh
safe-dev -C /private/tmp/mass-spinner-dev-inputs --memory 1G run --online -- sh -eu -c '
  mkdir -p /work/home/tools
  cd /work/home/tools
  curl -fsSLO https://nodejs.org/dist/v26.13.1/SHASUMS256.txt
  curl -fsSLO https://nodejs.org/dist/v26.13.1/node-v26.13.1-linux-arm64.tar.xz
  grep " node-v26.13.1-linux-arm64.tar.xz$" SHASUMS256.txt | sha256sum -c -
  tar -xf node-v26.13.1-linux-arm64.tar.xz
  rm node-v26.13.1-linux-arm64.tar.xz
  export PATH=/work/home/tools/node-v26.13.1-linux-arm64/bin:$PATH
  cd /work/project
  python3 scripts/dev-snapshot.py . --verify
  git init -q
  git hash-object -t commit -w dev-source-commit
  git update-ref HEAD "$(python3 -c '\''import json; print(json.load(open("dev-inputs.json"))["sourceRevision"])'\'')"
  node --version
  npm --version
  npm ci --ignore-scripts --no-audit --no-fund
'
```

The raw commit object preserves the real base revision needed by the build's source links. This is an **incomplete development checkout**, not a replacement Git repository or production release source. Commit parents and omitted scientific blobs are absent. Use the complete checkout in CI for publication.

## Check a change

Prefix guest commands with:

```sh
safe-dev -C /private/tmp/mass-spinner-dev-inputs --memory 1G run -- \
  env PATH=/work/home/tools/node-v26.13.1-linux-arm64/bin:/usr/local/bin:/usr/bin:/bin \
  sh -eu -c '
    python3 -m unittest discover -s tests -p test_dev_snapshot.py -v
    node --import tsx --test --test-concurrency=1 tests/surface-viewer-v39.test.ts
  '
```

Choose the relevant test instead of repeating the example. At the final gate, run the offline test/build sequence from [verify.yml](../.github/workflows/verify.yml): all typechecks, lint, Python checks, serial TypeScript tests, build and asset/site/release checks. Browser checks additionally need the pinned Chromium image from `ci/Dockerfile.browser`; the small safe-dev source snapshot does not install a browser. Scientific qualification jobs use their dedicated pinned images and full inputs.

After source changes, build another fresh snapshot. Before `safe-dev sync --replace-guest`, export any unique guest results for review: sync deletes guest edits, dependencies and the temporary Git identity. Repeat verification, Git bootstrap and `npm ci` after syncing. Tools under `/work/home` survive. Coordinate guest use; never remove another task's VM lock or running volume.

## Scientific evidence

Keep existing evidence in place. For future large results, archive immutable artifacts separately from the hot development inputs, with a catalog entry containing the source commit, input/lock hashes, tool versions or image digest, invocation, artifact SHA256, individual result hashes and qualification scope. Verify downloaded checksums before reading results and test a restored artifact before any migration. Keep failed studies and unique raw measurements; a passing web build does not establish experimental accuracy.
