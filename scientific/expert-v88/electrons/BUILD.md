# Reproduction and build provenance

All dependency/build/scientific execution ran in safe-dev for
`/private/tmp/mass-spinner-electrons-v88-20261112`, volume
`safe-dev-94a72a564d4c875a`. No host compiler/scientific interpreter ran.
Guest GCC 12.2.0 (`Debian 12.2.0-14+deb12u1`), Python 3.11.2, CMake 3.31.10;
bundled Eigen 3.4.0 and nlohmann JSON 3.7.0. Native binary SHA256:
`b8e74938edaba606175bc9a70160a26e76a92a7745dca91246faef8bcadd3a66`.

Copy into a fresh project and initialize safe-dev. Inside its guest:

```sh
git clone https://github.com/LoKI-Suite/LoKI-B-cpp upstream
git -C upstream checkout add55181430adec223efcf56233c7139ed40b8d2
python3 -m venv .venv
.venv/bin/pip install cmake==3.31.10
.venv/bin/cmake -S upstream -B build \
  -DLOKIB_USE_BUILTIN_EIGEN=ON -DLOKIB_USE_BUILTIN_NLOHMANN_JSON=ON \
  -DLOKIB_USE_OPENMP=OFF -Dwith-tests=ON -Dwith-doc=OFF \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_CXX_FLAGS="-isystem /work/project/upstream/include/eigen-3.4.0 -isystem /work/project/upstream/include/nlohmann-3.7.0"
.venv/bin/cmake --build build \
  --target loki loki_test_eedf_utilities test_trans_coefs test_grid -j1
```

Use `safe-dev ... run --online` only for required downloads; compilation and
science run offline. Check data hash and source/data license terms first.

The initial build lacked `-isystem` and failed: bundled Eigen uses `m_data=0`,
while upstream enables `-Wzero-as-null-pointer-constant` with `-Werror`.
System-include classification resolves third-party warnings without changing
source or disabling warnings for LoKI's code. Original failed `build.log`,
final configure/build logs and source hashes are retained. This compiler
compatibility fix changes no solver mathematics. Tracked `git diff --stat`
was empty after the complete campaign.

Actual sequence: configure without the flag, reconfigure the same build with
system includes, then build these targets. The combined fresh-build recipe
above is equivalent but was not rerun in a second pristine guest.

Executed verification:

```sh
build/tests/test_grid
build/tests/loki_test_eedf_utilities
build/tests/test_trans_coefs
build/app/loki upstream/input/Argon/Ar_swarm_setup.in
python3 adapter.py
python3 extension.py
python3 admission.py
python3 -m unittest -v test_adapter test_admission
```

The two campaign scripts deliberately exit 1 on their frozen global failures;
all 44 physical native cases exited 0. Other listed commands completed with
exit 0. Existing result directories/admission are immutable: reproduce into a
fresh project **without these generated outputs**, preserving this reference.
Receipts seal exact producer/protocol and native-output bytes. `inputs/` holds
all 44 exact generated configurations. The separate admission layer never
changes original campaign files. Eight final tests check signed power, stale
data/schema, mutated native/table inputs and physical-domain guards.

To preserve builds across explicit source resyncs, runtime moved guest-only to
`/work/home/loki-runtime-v88`, linked back to `/work/project/{upstream,build}`.
Runtime/symlinks were excluded from exports; valuable results were exported
before replacement. Final tested producer hashes: `TESTED-SNAPSHOT.json`.
