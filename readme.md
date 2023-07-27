# Guard

A Proxy server than accepts a list of validation rules and will either: pass a request through if is validated successfully or block and return a `HTTP status code 401`.

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

Handlers and Paths are the backbone of this ReverseProxy Server. Paths are attached to handlers which will validate the accessibility of each URL. Handlers are chained together to test and validate accessibility.

Handlers are JavaScript function with the following signature

```ts
import type { IncomingHttpHeaders } from 'http';

export type Maybe<T> = T | null | undefined;

export type RequestValues = [
    method: Maybe<string>, 
    headers: IncomingHttpHeaders,
    params: Maybe<Record<string, string>>, 
    query: Maybe<Record<string, string> | undefined>,
    args?: any
];

export type ValidationHandler = (requestValues: RequestValues) => Promise<RequestValues>;
```

As you can see, the handler will return the arguments that they receive, which allows you to chain together multiple handlers. Each handler can therefor test a subset of the overall validation criteria. Validation rules can be composed and reused.

A very simple Handler that only allow **GET** request to go through would look like this
```ts
const compareGetRequests: ValidationHandler = ([method, headers, params, query, args]) => {
    if (method?.toLowerCase() === 'get') return Promise.resolve([method, headers, params, query, args]);
    throw new Error(`Does not have access to ${method}`);
}
```
If the method is **GET**, it will be resolved, if not, an exception it thrown.

If we want to, for example, restrict requests so that only Mozilla based browsers can have access, we can create a new Handler
```ts
const compareAcceptLanguage: ValidationHandler = ([method, headers, params, query, args]) => {
    if (header['accept-language'].includes('Mozilla')) return Promise.resolve([method, headers, params, query, args]);
    throw new Error(`Not a Mozilla browser`);
}
```


### Defining Handlers and Paths
If we now want to apply both rules we do it like this:
```ts
import type { Route } from './handlers';

const config: Route[][] = [
    [
        {
            path: "/blogs/:id", handler: [compareGetRequests, compareAcceptLanguage]
        },
    ],
];
```

Be advised that the rules are read from right to left. In the example above, the AcceptLanguage is checked first and the the request method.

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
            path: "*", handler: [(arguments) => Promise.resolve(arguments)],
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

## Utilities

### JWT
This repo comes with a very simple utility function for validating JWT tokens.

This simple utility function is expecting JWT tokens to be passed in the traditional way of http header:

```
Authorization: Bearer <jwt token>
```

The signature looks like this:
```ts
export function validateJWT (fetchSecret: () => Promise<string>): ValidationHandler
```
It is only concerned about the token being valid, not what is inside the token.

Because JWT's verification process requires a **secret**, this function takes in the `fetchSecret: () => Promise<string>` function that should return the **secret** that was used to sign the JWT token. This could be a http request to an _auth server_ or what ever is required.

If the **secret** is already an environment variable, this repo comes with a `getJWTSecretFromEnv` function that simply returns the `JWT_SECRET` environment variable.

It's not a good idea to pass a secret variable to a Docker image when run so the Dockerfile has support for passing the **secret** in at build time by using the `--build-arg arg_jwt_secret=<secret>` argument.


```sh
docker build -t proxy-server --build-arg arg_ssh_key="$(cat $(pwd)/pem/key.pem)" --build-arg arg_ssh_cert="$(cat $(pwd)/pem/cert.pem)" --build-arg arg_jwt_secret=123 .
```

### Example
A concrete example of a user who has the scope `blog:read` set to true and is therefor allowed to read all blogs (all GET requests to any /blogs/:id) could look like this. In this example, the JWT token is an environment variable.


```js
const jwtToken = HMACSHA256(
    /*HEADER*/ {
        "alg": "HS256",
        "typ": "JWT"
    }
    /*PAYLOAD*/ {
        "blog:read": true
    },
    'secret'
)
```
```ts
const compareReadBlogScope: ValidationHandler = ([method, headers, params, query, args]) => {
    if(args['blog:read'] === true) return Promise.resolve([method, headers, params, query, args]);
    throw new Error('Does not have "blog:read" rights');
}
const compareGetRequests: ValidationHandler = ([method, headers, params, query, args]) => {
    if (method?.toLowerCase() === 'get') return Promise.resolve([method, headers, params, query, args]);
    throw new Error(`Does not have access to ${method}`);
}
const config: Route[][] = [
    [
        {
            path: "/blogs/:id", handler: [compareGetRequests, compareReadBlogScope, validateJWT(getJWTSecretFromEnv)],
        },
    ]
]
```
#### How it works
First `validateJWT` is called. It is closure function that takes in the `getJWTSecretFromEnv` which will read the JWT secret from the environment. It then returns a `ValidationHandler` function. When the request is made, the `validateJWT`'s inner function is run which will evaluate the JWT token and if it's valid, will pass control over to the next function. It will also pass the JWT's payload to the next function in the `args?: any` argument.

Next the `compareReadBlogScope` function will run, which checks the JWT's payload for the `'blog:read'` value.

Lastly the `compareGetRequests` function will run, which will check the HTTP method, if it is **GET** the whole validation chain has succeeded and the ProxyServer will pass the request onto the ResourceServer... if not it will stop and issue a **401** response.



### HTTP BasicAuth
This repo comes with a HTTP BasicAuth validation.

It's expecting the authentication to be passed as HTTP header

```
Authorization: Basic <base64(username:password)>
```

The signature of the function looks like this
```ts
export const validateBasicAuth = (validateCredentials: (username: string, password: string) => Promise<boolean>): ValidationHandler => async ([method, headers, params, query])
```

The `validateCredentials` gets passed the username/password as provided in the HTTP header. The function is expected to return a `Promise<boolean>` to indicate if the username/password match something on file. An implementation of this function could go to a LDAP server or any other authentication server, using the username/password provided to look up the user.

If the user is not found or the password is incorrect, an implementation of this function should throw an error.

The docker image has support for passing in the environment variables `BASIC_AUTH_USERNAME` and `BASIC_AUTH_PASSWORD`. The repo provides the function `getBasicAuthFromEnv` which will pick up these values and return in a tuple.

It's not a good idea to pass these values in when running the image, so the Dockerfile has support for passing them in at build time by using.

```sh
docker build -t proxy-server --build-arg arg_ssh_key="$(cat $(pwd)/pem/key.pem)" --build-arg arg_ssh_cert="$(cat $(pwd)/pem/cert.pem)" --build-arg arg_basic_auth_username=<username> --build-arg arg_basic_auth_password=<password>.
```

The `getBasicAuthFromEnv` is more for development purposes as it is expecting there only to be one user available.

## References

* https://www.thoughtworks.com/en-br/insights/blog/microservices/using-abac-solve-role-explosion






