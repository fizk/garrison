# Garrison

**garrison**
_/ˈɡarɪs(ə)n/_
noun
> a group of troops stationed in a fortress or town to defend it.
"the entire garrison was mustered on the parade ground"

A Proxy server than accepts a list of validation rules and will either: pass a request through, if is validated successfully or block and return a `HTTP status code 401`.

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
Rules are defined with a `pattern` and `handlers`. Patterns are defined using the [URLPatter](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern) interface.


## Handlers
Handlers are an array of function that either Resolve or throw Exceptions.

```ts
export type Maybe<T> = T | null | undefined;

export type RequestValues = [
    request: Request,
    params: Maybe<Record<string, Maybe<string>>>,
    args?: Maybe<Record<string, string> | string[]>
];

export type ValidationHandler = (requestValues: RequestValues) => Promise<RequestValues>;
```

Handler will return the arguments that they receive, which allows you to chain together multiple handlers. Each handler can therefor test a subset of the overall validation criteria. Validation rules can be composed and reused.

A very simple Handler that only allow **GET** request to go through would look like this
```ts
const compareGetRequests: ValidationHandler = ([request, params, args]) => {
    if (request.method?.toLowerCase() === 'get') return Promise.resolve([request, params, args]);
    throw new Error(`Does not have access to ${method}`);
}
```
If the method is **GET**, it will be resolved, if not, an exception it thrown.

If we want, for example, to restrict requests so that only Mozilla based browsers can have access, we can create a new Handler
```ts
const compareAcceptUserAgent: ValidationHandler = ([request, params, args]) => {
    if (request.header.get('User-Agent').includes('Mozilla')) return Promise.resolve([request, params, args]);
    throw new Error(`Not a Mozilla browser`);
}
```


### Defining Handlers and Paths
If we now want to apply both rules we do it like this:
```ts
import type { Route } from './handlers';

const config: Route[][] = [
    {
        pattern: new URLPattern({
            hostname: '*',
            pathname: '/',
            search: '*'
        }),
        handlers: [compareGetRequests, compareAcceptUserAgent]
    },
];
```

Be advised that the rules are read from right to left. In the example above, the `compareAcceptUserAgent` is checked first and then the request method.

## Description
This ReverseProxy server is somewhat based off of the Attribute-Based Access Control (ABAC) idea. The server itself would be the PEP (Policy Enforcement Point) and the JavaScript (Route) rules would be the PDP (Policy Decision Point).

The JavaScript rules would then call out to the PIP (Policy Information Point) and the PRP (Policy Retrieval Point) as they needed.

![](https://www.nextlabs.com/wp-content/uploads/XACML-PAGE-DIAGRAM-2.png)

## HTTPS
This server can only run as https.

### create ssl

```bash
cd pem
openssl genrsa -out key.pem
openssl req -new -key key.pem -out csr.pem
openssl x509 -req -days 365 -in csr.pem -signkey key.pem -out cert.pem
rm csr.pem
```

The proxy also needs a full URL to the server it is protecting, for example `https://example.com`, the proxy will figure out which protocol to use.

## Building and running the proxy with Docker
Here is an example of building the Proxy using the Dockerfile.

SSH key and certificate are being read from files and passed to the build-arg command. They will then be turned into environment variables available to the proxy when the proxy is run.

```sh
docker build -t proxy-server --build-arg arg_ssh_key="$(cat $(pwd)/pem/key.pem)" --build-arg arg_ssh_cert="$(cat $(pwd)/pem/cert.pem)" .
```

The SSH key and cert are now baked into the container.

To run the container, map the port and pass in any additional env variables required.
```sh
docker run -e RESOURCE_SERVER_URL=https://example.com -e PORT=3000 -p 8080:3000 proxy-server
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

It uses **RS256** so the `fetchSecret` needs to return a valid RS256 key.

```sh
docker build -t proxy-server --build-arg arg_ssh_key="$(cat $(pwd)/pem/key.pem)" --build-arg arg_ssh_cert="$(cat $(pwd)/pem/cert.pem)" --build-arg arg_jwt_key=123 .
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
};

const compareGetRequests: ValidationHandler = ([method, headers, params, query, args]) => {
    if (method?.toLowerCase() === 'get') return Promise.resolve([method, headers, params, query, args]);
    throw new Error(`Does not have access to ${method}`);
};

const config: Route[][] = [
    [
        {
            pattern: new URLPattern({
                hostname: '*',
                pathname: '/blogs/:id',
                search: '*'
            }),
            handler: [compareGetRequests, compareReadBlogScope, validateJWT(getKeyFromEnv)],
        },
    ]
]
```
#### How it works
First `validateJWT` is called. It is closure function that takes in the `getKeyFromEnv` which will read the JWT secret from the environment. It then returns a `ValidationHandler` function. When the request is made, the `validateJWT`'s inner function is run which will evaluate the JWT token and if it's valid, will pass control over to the next function. It will also pass the JWT's payload to the next function in the `args?: any` argument.

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
export const validateBasicAuth = (validateCredentials: (username: string, password: string) => Promise<boolean>): ValidationHandler => async ([request, params, query])
```

The `validateCredentials` gets passed the username/password as provided in the HTTP header. The function is expected to return a `Promise<boolean>` to indicate if the username/password match something on file. An implementation of this function could go to a LDAP server or any other authentication server, using the username/password provided to look up the user.

If the user is not found or the password is incorrect, an implementation of this function should throw an error.

The docker image has support for passing in the environment variables `BASIC_AUTH_USERNAME` and `BASIC_AUTH_PASSWORD`. The repo provides the function `getBasicAuthFromEnv` which will pick up these values and return in a tuple.


The `getBasicAuthFromEnv` is more for development purposes as it is expecting there only to be one user available.

## Test

```sh
docker build --target build -t testme .
docker run --rm testme deno test
```

or use docker compose
```sh
docker compose run --rm test   
```

## References

* https://www.thoughtworks.com/en-br/insights/blog/microservices/using-abac-solve-role-explosion






---



docker run --rm -p 3030:3030 -e SSH_KEY="$(cat $(pwd)/pem/ssh-key.pem)" -e SSH_CERT="$(cat $(pwd)/pem/ssh-cert.pem)" -e JWT_KEY="$(cat $(pwd)/pem/public.pem)"  deleteme




### Public key
```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxZqlbdy6WZiRKD1eZ21n
6ScDbV4X6ewrUtHtmOAw6XS1ncku0CL82GY0NwJYVbhm5W81+Mr4OAis7ICfIKp3
jS84w0mqMOsFc9XuQTeO1H7ZO2AMCM75J3sikOZzgCKTD9aVLQwvznwqP7kWWo+/
6wTJ9nH+V7QHgUWX9CoyUfa72HE6FDZ89NZpID6SklHUfVc3KQmNs69bAlqdGdLp
UcoekOV1oBDs6jzgVqOi77tC6WNlo9nC6J6uuraHq9QtD61VIXryXP2WUfUSFMzF
lvQm3ht4v3jlRGaV4TcjzBY4JiHN64ZpzfXJAtQF8gXuKodPaXZ6ujYIplVOU3Lj
xwIDAQAB
-----END PUBLIC KEY-----
```

### Private key
```
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDFmqVt3LpZmJEo
PV5nbWfpJwNtXhfp7CtS0e2Y4DDpdLWdyS7QIvzYZjQ3AlhVuGblbzX4yvg4CKzs
gJ8gqneNLzjDSaow6wVz1e5BN47Uftk7YAwIzvkneyKQ5nOAIpMP1pUtDC/OfCo/
uRZaj7/rBMn2cf5XtAeBRZf0KjJR9rvYcToUNnz01mkgPpKSUdR9VzcpCY2zr1sC
Wp0Z0ulRyh6Q5XWgEOzqPOBWo6Lvu0LpY2Wj2cLonq66toer1C0PrVUhevJc/ZZR
9RIUzMWW9CbeG3i/eOVEZpXhNyPMFjgmIc3rhmnN9ckC1AXyBe4qh09pdnq6Ngim
VU5TcuPHAgMBAAECggEBAMH5Tb0ruO4smwmCPIKQ3jj8KBwbCqSBRgH1uyOfp8Pz
4jhyffao8cVHhqgdMDNtYeyFH9kK/WCb+4vpsssxK0w3d6QUUvHUMzUDYu84J4gm
wP3NCeM3sVL1R/gvkF/PEMeyYBupY+Bw+FQ3T180zzNYLx0xx3e2bMuUUlbHeUAE
l67qJsf3Lribld4HIAGozJeMwfIiQtkSlGjdDgAm5q2qR65lEfnvhSVYLAWD6Arb
khpagdOK4APu32txFELCnuPGXr9Jx0hf5vwMW2wOYdWnDOrX/rDWxQpyO99ok/Ln
UIyroxuLqd75YKAIkluhSZ3acOOwuafE+sjx5fPQKMkCgYEA5iFMUUvPdhoVL3/h
wkcmRFYMx+0R1MKrTAa7VCDjf1SumVqztqJ97Nx+1BP6Tfw0MVgz4BqFwWHLhnVz
zPahX9XOW+g9MxGtLqIkkrG0FKmQlnnqBEsi/D0uec7e5/kmMtp/CJlBQIVfIFpr
u4C15yWxe/B9XKjb90Pi+olNJMUCgYEA29FQC8vSIHRDSVaVHNIAW+BHYmfKczcF
msQMrCTBbxaA50llOYdnMRtj3RlaSO9LkP4PihCOxyayi6sJgBLS4tkU4QPSMEgd
Lp6xtDXpjorFP93lc8RFFA0t14B6UqjDkvpzEmVGtB1ZN1Nsvff+Rpp+CjQIijH4
uF87inA+JxsCgYAmKZdyU9QPjbu9qMNTaGEcK/jqnpG6ap3leahPBzUyxGQ/4h6z
RrcDNH2DxdxYWl59YFcZ7swHiaQqpAeUEcIpFlemPhkIAwJpHVJbUUS/uG7VxVnd
ZGhk0/CFGp00csi23iz6zA9aF8PypYwACBQiRMnt96+SUh5IHuXhDivQ0QKBgQCs
+Wnmzm28ciCcrlBKTIpRwgwKSKhLv6leXxWlxIqekvO+jMfl3EH8p5QO4Stlp0As
iW/K8jqYRkBLnbytFqLyNWazpmEY8zZbgC9QIvh13YdYOZGcZn8BR1micgxPzVOQ
7hntCNr5UvroiXJRjrt97YZvGwD5VldlJjNhPe/6rwKBgEDs2gMqIrjI+cH8UMHq
GN5eZ6TbSboV/naxkBYn6DoEhBswr5tGKcbQczGuDzZX/lLjCxGNsfHRWAQ/QcHn
GOS/FeBG4HrjIRjpknKjVd+gs7cJYuarWJAnTAMwm5wlfgaUyM2OsgxmnEB47in0
LN2UqU1duKp1VBDfLtYLw0+U
-----END PRIVATE KEY-----
```

### JWT
```
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.Gpbd7uRpC32emuSflvIoVM1oSpvwUqgh4CTjlhnIOCuJX4AqbMXQqdo-ZUcyFeJasd5LQZwj6zxHvgEJmbePGsm9mkNIzccsEZ7Hx8ZOEib7v0Q6qU_t4z0yMiSeO01OogMCapb2TfM77DvXQtMREE_pTje2-lT2n20tdTb5Md2nkxlkduBRNKMHe0yRbQpBDPFl5RW9DC6XE47W5nqMxdwC0lskaxzSRHxnNbZbrO710ef_LYEpPeKGbz2RKGZm72WHO5vjUOuZKU8ZK68S1LcJleAqSwJ1O9F4ToDgMB8SQ1CJRnSL-v8oVmREDZbiAlkUnr1Ir_4C4TxSO2b0_w
```


### BasicAuth
```
"authorization": "Basic dXNlcm5hbWU6cGFzc3dvcmQ=",
```
