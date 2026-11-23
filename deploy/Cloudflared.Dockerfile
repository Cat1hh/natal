FROM golang:1.27.4-alpine AS build
RUN apk add --no-cache git ca-certificates
WORKDIR /src
RUN git clone --depth 1 --branch 2026.11.1 https://github.com/cloudflare/cloudflared.git .
ENV CGO_ENABLED=0
RUN go get golang.org/x/crypto@v0.59.0 golang.org/x/net@v0.62.0 \
    && go build -mod=mod -trimpath -ldflags='-s -w -X main.Version=2026.11.1' -o /out/cloudflared ./cmd/cloudflared

RUN test "$(git rev-parse HEAD)" = "518d7f7969b764df628bb4b1088f0f154901dc4e"

FROM alpine:3.24 AS runtime
RUN apk upgrade --no-cache && apk add --no-cache ca-certificates
COPY --from=build /out/cloudflared /usr/local/bin/cloudflared
ENV NO_AUTOUPDATE=true
USER 65532:65532
ENTRYPOINT ["cloudflared"]
CMD ["version"]
