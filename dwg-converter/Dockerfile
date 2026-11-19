# CAD2D · conversor DWG → DXF (servidor). Corre como Cloudflare Container detrás de worker.js.
# Usa GNU LibreDWG (GPL v3) como PROGRAMA SEPARADO y sin modificar: CAD2D le envía un archivo
# y recibe otro. LibreDWG no se distribuye a los usuarios ni se enlaza con el código de CAD2D.
FROM debian:bookworm-slim AS build
ARG LIBREDWG_VERSION=0.13.3
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential curl ca-certificates xz-utils pkg-config python3 \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /src
RUN curl -fsSL "https://ftp.gnu.org/gnu/libredwg/libredwg-${LIBREDWG_VERSION}.tar.xz" -o libredwg.tar.xz \
 && tar xf libredwg.tar.xz && cd "libredwg-${LIBREDWG_VERSION}" \
 && ./configure --disable-bindings --disable-write --prefix=/opt/libredwg \
 && make -j"$(nproc)" && make install

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 ca-certificates \
 && rm -rf /var/lib/apt/lists/* && useradd -r -u 10001 conversor
COPY --from=build /opt/libredwg /opt/libredwg
ENV PATH="/opt/libredwg/bin:${PATH}" LD_LIBRARY_PATH="/opt/libredwg/lib"
COPY server.py /app/server.py
USER conversor
EXPOSE 8080
CMD ["python3", "/app/server.py"]
