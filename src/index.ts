
import fs from 'fs';
import path from 'path';
import RouteRecognizer from 'route-recognizer';
import { startServer } from './server'
import { validateJWT, getJWTSecretFromEnv } from './validators/jwt';
import { validateBasicAuth, getBasicAuthFromEnv } from './validators/basicAuth';
import type { Route, Router, ValidationHandler } from './handlers';

const compareGetRequests: ValidationHandler = ([method, headers, params, query, args]) => {
    if (method?.toLowerCase() === 'get') return Promise.resolve([method, headers, params, query, args]);
    throw new Error(`Does not have access to ${method}`);
}

const compareReadBlogScope: ValidationHandler = ([method, headers, params, query, args]) => {
    if(args['blog:read'] === true) return Promise.resolve([method, headers, params, query, args]);
    throw new Error('Does not have "blog:read" rights');
}

const fetchRemoteScope: ValidationHandler = ([method, headers, params, query, args]) => {
    // calls to a remote server by username and gets back user-scope
    // const scope = getScopeByUser(args[0])
    const scope = {'blog:read': true}; // just mocking it for demonstration purposes
    if (!scope) throw new Error(`No scopes provided for user ${args[0]}`);
    return Promise.resolve([method, headers, params, query, scope]);
}

const comparePostIDs = (ids: any[]): ValidationHandler => ([method, headers, params, query, args]) => {
    if (ids.includes(params?.id)) return Promise.resolve([method, headers, params, query, args]);
    throw new Error(`User does not have access to post "${params?.id}"`);
}

const config: Route[][] = [
    [
        {
            // Example of JWT authentication
            path: "/blogs/:id", handler: [
                comparePostIDs(['1']), 
                compareReadBlogScope, 
                compareGetRequests, 
                validateJWT(getJWTSecretFromEnv)
            ],
        },
        {
            // Example of HTTP BasicAuth authentication
            path: "/comments/:id", handler: [
                comparePostIDs(['1']), 
                compareReadBlogScope, 
                fetchRemoteScope, 
                compareGetRequests, 
                validateBasicAuth(getBasicAuthFromEnv)
            ],
        },
    ]
    ,
    [
        {
            path: '*', handler: [(args) => {
                return Promise.resolve(args);
            }]
        }
    ],
];

const RESOURCE_SERVER_URL = process.env.RESOURCE_SERVER_URL || 'http://localhost:8083';
const PROXY_SERVER_PROTOCOL = process.env.PROXY_SERVER_PROTOCOL || 'https';
const PROXY_SERVER_PORT = process.env.PROXY_SERVER_PORT || 3030;

const sslKey = process.env.SSH_KEY || fs.readFileSync(path.join(__dirname, '..' ,'pem', 'key.pem')).toString();
const sslCert = process.env.SSH_CERT || fs.readFileSync(path.join(__dirname, '..' ,'pem', 'cert.pem')).toString();

const router = new RouteRecognizer();
config.forEach(path => router.add(path));

startServer(
    router as Router, 
    PROXY_SERVER_PROTOCOL, 
    Number(PROXY_SERVER_PORT), 
    RESOURCE_SERVER_URL, 
    sslKey, 
    sslCert
);
