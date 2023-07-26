# Guard

A Proxy server than accepts a list of validation rules and will either: pass a request through if validated successfully or block and return a `HTTP status code 401`.


```
Public VPN             Private VPN

                           ┌----------------------┐
                           │                      │
┌--------┐  req     ┌---------┐    ┌----------┐   │
│ client │--------->│  proxy  │--->│  server  │   │
│        │<---------│         │    │          │   │
└--------┘  res     └---------┘    └----------┘   │
                       ↓  ↑ pass/fail             │
                    ┌----------┐                  │
                    │ validate │                  │
                    │   rules  │                  │
                    └----------┘                  │
                           │                      │
                           └----------------------┘
```

## Rules.
The rules are attached to a URL route. This server uses [route-recognizer](https://github.com/tildeio/route-recognizer), read more about the how to define routes [here](https://github.com/tildeio/route-recognizer#usage).

## Handlers
Handlers are any JavaScript function that subscribe to this signature
```ts
import type { IncomingHttpHeaders } from 'http';

type Maybe<T> = T | null | undefined;

export type ValidationHandler = (
    method: Maybe<string>, 
    headers: IncomingHttpHeaders, 
    params: Maybe<Record<string, string>>, 
    query: Maybe<Record<string, string> | undefined>
) => Promise<boolean>;
```

## Defining Handlers and Paths
```ts
import type { Route } from './handlers';

const config: Route[][] = [
    [
        {
            path: "/blog", handler: (method, headers, params, query) => {
                // Validate request
                return Promise.resolve(true);
            },
        },
        {
            path: "/:id", handler: (method, headers, params, query) => {
                // Validate request
                return Promise.resolve(true);
            }
        },
    ],
];
```

## Description
This ReverseProxy server is somewhat based off of the Attribute-Based Access Control (ABAC) idea. The server itself would be the PEP (Policy Enforcement Point) and the JavaScript rules would be the PDP (Policy Decision Point).

The JavaScript rules would then call out to the PIP (Policy Information Point) and the PRP (Policy Retrieval Point) as they needed.

![](https://www.nextlabs.com/wp-content/uploads/XACML-PAGE-DIAGRAM-2.png)

## HTTP / HTTPS
This server can run either as http or https, pass in a `protocol` (`http` or `https`). With https you also have to pass in a SSH key and certificate 

### create ssl

```bash
cd pem 
openssl genrsa -out key.pem
openssl req -new -key key.pem -out csr.pem
openssl x509 -req -days 365 -in csr.pem -signkey key.pem -out cert.pem
rm csr.pem
```

The proxy also needs a full URL to the server for example `https://example.com`, the proxy will figure out which protocol to use and if it is https, it will use the same SSH key and certificate to authenticate with the server.

## Building and running the proxy with Docker
Here is an example of building the Proxy using the Dockerfile.

SSH key and certificate are being read from files and passed to the build-arg command. They will then be turned into environment varaibles available to the proxy when the proxy is run.

```sh
docker build -t proxy-server --build-arg arg_ssh_key="$(cat $(pwd)/pem/key.pem)" --build-arg arg_ssh_cert="$(cat $(pwd)/pem/cert.pem)" .
```

The SSH key and cert are now baked into the container.

To run the container, map the port and pass in any additional env variables required.
```sh
docker run -e RESOURCE_SERVER_URL=https://example.com -e PROXY_SERVER_PROTOCOL=https -e PROXY_SERVER_PORT=3000 -p 8080:3000 proxy-server
```

## Example
This is an example of how the `index.ts` file could look like. The only thing to do is to write your own authorization rules and handlers

```ts
import fs from 'fs';
import path from 'path';
import RouteRecognizer from 'route-recognizer';
import { startServer } from './server'
import type { Route, Router } from './handlers';

const RESOURCE_SERVER_URL = process.env.RESOURCE_SERVER_URL;
const PROXY_SERVER_PROTOCOL = process.env.PROXY_SERVER_PROTOCOL;
const PROXY_SERVER_PORT = process.env.PROXY_SERVER_PORT;
const SSH_KEY = process.env.SSH_KEY;
const SSH_CERT = process.env.SSH_CERT;

// WRITE YOUR OWN RULES
//  this would be the only part you have to write
//  you could even move this to a separate file so it's
//  easier to test.
const config: Route[][] = [
    [
        {
            path: "*", handler: (method, headers, params, query) => {
                return Promise.resolve(true);
            },
        },
    ],
];
// --end of: WRITE YOUR OWN RULES

const router = new RouteRecognizer();
config.forEach(path => router.add(path));

startServer(
    router as Router, 
    PROXY_SERVER_PROTOCOL, 
    Number(PROXY_SERVER_PORT), 
    RESOURCE_SERVER_URL, 
    SSH_KEY, 
    SSH_CERT
);

```

## References

* https://www.thoughtworks.com/en-br/insights/blog/microservices/using-abac-solve-role-explosion