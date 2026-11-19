# Development

The full checkout contains scientific evidence and is larger than the safe-dev input limit of 512 MiB. `scripts/dev-snapshot.py` makes a separate copy of web build and test inputs from its approved list: the development snapshot. It does not change the checkout, historical studies, or Git history.

The approved input list includes application source, tools, tests, documentation, web assets, Blender inputs, and scientific test data. Within these paths, the script includes tracked files and new files that Git does not ignore. The script rejects symbolic links and credential paths in its denylist. Historical studies can have inputs outside this snapshot.

## Prepare an isolated workspace

Use the host only to prepare source files. Use the guest for dependency installation, tests, and builds. Use a new destination:

```sh
python3 scripts/dev-snapshot.py /private/tmp/mass-spinner-dev-inputs
python3 scripts/dev-snapshot.py /private/tmp/mass-spinner-dev-inputs --verify
safe-dev -C /private/tmp/mass-spinner-dev-inputs --memory 1G init
```

The input manifest `dev-inputs.json` records each file's size and SHA256, the package-lock hash, and the base commit. Save the printed manifest hash with verification results.

Before you make `.git`, `node_modules`, or build output, do the snapshot verification. Verification accepts only the recorded file inventory and hashes. It rejects added files from dependency installation.

File hashes identify working-tree changes outside the base commit. After source changes, make a new snapshot. The snapshot does not receive later checkout changes.

The safe-dev image for this procedure has Node 22. This project uses Node 26.13.1 / npm 11.20.0. For an ARM64 guest, install the official ARM64 distribution in the guest. For an x86 guest, use `linux-x64`:

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

The raw commit object keeps the base revision for the source links in the build. The development checkout does not contain commit parents or all scientific file objects. Use this checkout only for development. Use the full checkout in CI for publication.

## Change verification

Use this command structure for guest tests:

```sh
safe-dev -C /private/tmp/mass-spinner-dev-inputs --memory 1G run -- \
  env PATH=/work/home/tools/node-v26.13.1-linux-arm64/bin:/usr/local/bin:/usr/bin:/bin \
  sh -eu -c '
    python3 -m unittest discover -s tests -p test_dev_snapshot.py -v
    node --import tsx --test --test-concurrency=1 tests/surface-viewer-v39.test.ts
  '
```

Select the test applicable to the change. Before publication, do the offline [verify.yml](../.github/workflows/verify.yml) sequence: all typechecks, lint, Python checks, serial TypeScript tests, build, and asset/site/release checks.

For browser checks, use the Chromium image with the version specified in `ci/Dockerfile.browser`. The development snapshot does not install a browser. Scientific qualification jobs use their specified images and full inputs.

Before `safe-dev sync --replace-guest`, export guest results that have no other copy. This command deletes guest changes, dependencies, and the temporary Git identity. Tools in `/work/home` stay in place. After this command, do snapshot verification again. Prepare the Git identity again. Use `npm ci` again.

Make a plan with other task owners before you operate a shared guest. Do not remove another task's VM lock or active volume.

## Scientific evidence

Keep existing evidence in place. For future large results, keep archive files separate from the development inputs. Do not change archive files after their creation. For each archive, record:

- The source commit and input and lockfile hashes
- The tool versions or image hash
- The command and artifact SHA256
- Each result hash and the qualification scope.

Before you read downloaded results, compare their checksums with the recorded values. Before a data migration, do a test with a restored artifact. Keep failed studies and raw measurements that have no other copy. A web build with no errors is not proof of experimental accuracy.
