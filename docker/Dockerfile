FROM oven/bun:1 AS base
WORKDIR /usr/src/app

FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

WORKDIR /usr/src/app
ENV NODE_ENV=production
ENV SKIP_ENV_CHECK=true
RUN bun run build:bun

FROM base AS release
COPY --from=prerelease /usr/src/app/dist /usr/src/app/dist
COPY --from=prerelease /usr/src/app/server .

USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "./server" ]