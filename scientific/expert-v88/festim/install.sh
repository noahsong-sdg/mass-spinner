#!/bin/sh
# Run only as a nonroot safe-dev guest, with network explicitly enabled.
set -eu
test "$(id -u)" = 1000
test "$(pwd)" = /work/project
mkdir -p .cache/bootstrap receipts
curl -fLsS https://micro.mamba.pm/api/micromamba/linux-aarch64/2.5.0 \
  -o .cache/bootstrap/micromamba.tar.bz2
printf '%s\n' '6ec1517c8c89c875a8fa93f9c66abd4fe3dd147341376bdc37b57c526bc13e44  .cache/bootstrap/micromamba.tar.bz2' \
  | sha256sum -c -
tar -xjf .cache/bootstrap/micromamba.tar.bz2 -C .cache/bootstrap bin/micromamba
sha256sum .cache/bootstrap/micromamba.tar.bz2 .cache/bootstrap/bin/micromamba \
  > receipts/bootstrap.sha256
export MAMBA_ROOT_PREFIX=/work/project/.cache/mamba
export MAMBA_EXTRACT_THREADS=1 MAMBA_DOWNLOAD_THREADS=1
MM=/work/project/.cache/bootstrap/bin/micromamba
# Native numerical stack from conda-forge; plotting extras are not required.
# Real upstream Python wheels preserve optional io4dolfinx backends instead of
# conda's unconditional PyVista/VTK/Qt dependency. No package is patched/stubbed.
"$MM" create -y --override-channels -c conda-forge -p /work/project/.venv \
  python=3.12.16 fenics-dolfinx=0.11.0 scifem=0.27.0 scipy=1.18.1 \
  'h5py=*=mpi_*' pip tqdm > receipts/conda-install.log 2>&1
"$MM" run -p /work/project/.venv python -m pip install \
  --report receipts/pip-install.json 'festim==2.2' 'io4dolfinx[h5py]==1.5.1' \
  > receipts/pip-install.log 2>&1
"$MM" run -p /work/project/.venv python -m pip check > receipts/pip-check.log
"$MM" list -p /work/project/.venv --explicit > receipts/conda-explicit.txt
"$MM" list -p /work/project/.venv --json > receipts/conda-packages.json
"$MM" run -p /work/project/.venv python -m pip freeze > receipts/pip-freeze.txt
