FROM node:24-bookworm-slim as node-build

WORKDIR /build

COPY --chown=node app app
COPY --chown=node components components
COPY --chown=node components.json components.json
COPY --chown=node eslint.config.mjs eslint.config.mjs
COPY --chown=node lib lib
COPY --chown=node next.config.ts next.config.ts
COPY --chown=node nginx.conf nginx.conf
COPY --chown=node package.json package.json
COPY --chown=node package-lock.json package-lock.json
COPY --chown=node postcss.config.mjs postcss.config.mjs
COPY --chown=node static static
COPY --chown=node styles styles
COPY --chown=node tsconfig.json tsconfig.json
COPY --chown=node types types
COPY --chown=node .env .env

RUN npm install && npm run build

FROM docker.io/nginx:1.29

COPY --from=node-build /build/out /usr/share/nginx/eu-bureauet
COPY nginx.conf /etc/nginx/conf.d/default.conf
