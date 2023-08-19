FROM denoland/deno:ubuntu-1.36.1 as test

WORKDIR /app

COPY ./src /app/src
COPY ./test /app/test
RUN deno cache /app/src/index.ts

FROM denoland/deno:ubuntu-1.36.1 as prod

# The port that your application listens to.
EXPOSE 3030

ENV PORT=3030
ENV REMOTE_SERVER=http://host.docker.internal:8083

ARG arg_ssh_key
ARG arg_ssh_cert
ARG arg_jwt_key

ENV KEY=$arg_ssh_key
ENV CERT=$arg_ssh_cert
ENV JWT_KEY=$arg_jwt_key

ENV BASIC_AUTH_USERNAME=
ENV BASIC_AUTH_PASSWORD=

WORKDIR /app

# Prefer not to run as root.
USER deno

# Cache the dependencies as a layer (the following two steps are re-run only when deps.ts is modified).
# Ideally cache deps.ts will download and compile _all_ external files used in main.ts.
COPY ./src /app/src
RUN deno cache /app/src/index.ts


CMD ["run", "--allow-net", "--allow-env", "/app/src/index.ts"]
