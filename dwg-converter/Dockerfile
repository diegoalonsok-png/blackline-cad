# CAD2D · conversor DWG → DXF (servidor). Corre como Cloudflare Container detrás de worker.js.
# Usa GNU LibreDWG (GPL v3) como PROGRAMA SEPARADO y sin modificar: CAD2D le envía un archivo
# y recibe otro. LibreDWG no se distribuye a los usuarios ni se enlaza con el código de CAD2D.
FROM debian:bookworm-slim AS build
# Versión de desarrollo fijada (commit): la 0.13.3 no lee las entidades de muchos DWG de versión 2007-2009
# (AC1021/AC1018 con objetos AEC); esta sí. Compilación estática: un único binario dwg2dxf.
ARG LIBREDWG_COMMIT=b5646570397a3d71063451f1097e04d68dc54137
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential cmake git ca-certificates pkg-config python3 \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /src
RUN git init libredwg && cd libredwg \
 && git remote add origin https://github.com/LibreDWG/libredwg.git \
 && git fetch --depth 1 origin "${LIBREDWG_COMMIT}" && git checkout -q FETCH_HEAD \
 && git submodule update --init --depth 1 jsmn \
 && sed -i 's/-Werror//g' CMakeLists.txt \
 && mkdir b && cd b \
 && cmake .. -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF -DCMAKE_C_FLAGS="-w" \
 && make -j"$(nproc)" dwg2dxf \
 && install -D -m 0755 dwg2dxf /opt/libredwg/bin/dwg2dxf

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 ca-certificates \
 && rm -rf /var/lib/apt/lists/* && useradd -r -u 10001 conversor
COPY --from=build /opt/libredwg /opt/libredwg
ENV PATH="/opt/libredwg/bin:${PATH}"
COPY server.py /app/server.py
USER conversor
EXPOSE 8080
CMD ["python3", "/app/server.py"]
