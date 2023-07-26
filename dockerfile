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
ARG arg_jwt_secret
ARG arg_basic_auth_username
ARG arg_basic_auth_password

ENV SSH_KEY=$arg_ssh_key
ENV SSH_CERT=$arg_ssh_cert

ENV JWT_SECRET=$arg_jwt_secret

ENV BASIC_AUTH_USERNAME=$arg_basic_auth_username
ENV BASIC_AUTH_PASSWORD=$arg_basic_auth_password

WORKDIR /app

COPY --from=build /app/dist /app/src
COPY ./package.json /app/package.json
COPY ./package-lock.json /app/package-lock.json

RUN npm i --omit=dev;

CMD [ "node", "/app/src/index.js" ]