import { readFile, writeFile } from 'node:fs/promises';
const dockerfile = (await readFile(new URL('../deploy/Cloudflared.Dockerfile', import.meta.url), 'utf8')).trim().split('\n').map(line => '        ' + line).join('\n');
const yaml = `services:
  cloudflared:
    image: vulpora-natal-cloudflared:2026.11.1-secure
    build:
      context: .
      dockerfile_inline: |
${dockerfile}
    restart: unless-stopped
    read_only: true
    mem_limit: 256m
    cap_drop: [ALL]
    security_opt: [no-new-privileges:true]
    tmpfs: ["/tmp:size=16m,noexec,nosuid"]
    environment:
      TUNNEL_TOKEN: \${NATAL_TUNNEL_TOKEN:?Configure NATAL_TUNNEL_TOKEN}
    command: [tunnel, --no-autoupdate, run]
    networks: [dokploy-network]
networks:
  dokploy-network:
    external: true
`;
await writeFile(new URL('../deploy/dokploy-tunnel.yml', import.meta.url), yaml);
console.log('Gerado deploy/dokploy-tunnel.yml sem credenciais.');
