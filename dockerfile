#
# COMPILE SOURCECODE
#
FROM node:20-alpine3.17 AS build

WORKDIR /app

COPY ./src /app/src
COPY ./package.json /app/package.json
COPY ./package-lock.json /app/package-lock.json
COPY ./tsconfig.json /app/tsconfig.json

RUN npm i; \
    npm run build;

#
# BUILDING PRODUCTION APPLICATION
#
FROM node:20-alpine3.17 AS production

ARG arg_ssh_key
ARG arg_ssh_cert

ENV SSH_KEY=$arg_ssh_key
ENV SSH_CERT=$arg_ssh_cert

WORKDIR /app

COPY --from=build /app/dist /app/src
COPY ./package.json /app/package.json
COPY ./package-lock.json /app/package-lock.json

RUN npm i --omit=dev;

CMD [ "node", "/app/src/index.js" ]