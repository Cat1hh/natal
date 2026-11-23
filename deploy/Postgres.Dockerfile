FROM postgres:17-alpine
# Atualiza bibliotecas e troca o gosu, que traz um runtime Go antigo,
# pelo su-exec do Alpine no entrypoint oficial.
RUN apk upgrade --no-cache \
    && apk add --no-cache su-exec \
    && sed -i 's/exec gosu postgres /exec su-exec postgres /g' /usr/local/bin/docker-entrypoint.sh \
    && rm /usr/local/bin/gosu
