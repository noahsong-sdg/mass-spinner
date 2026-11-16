FROM ghcr.io/fenics/dolfinx/dolfinx:v0.9.0
RUN python3 -m pip install --no-cache-dir --no-deps scipy==1.14.1 scikit-fem==12.0.2
ENV OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1 XDG_CACHE_HOME=/tmp/cache
WORKDIR /work
