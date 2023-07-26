
import fs from 'fs';
import path from 'path';
import RouteRecognizer from 'route-recognizer';
import { startServer } from './server'
import type { Route, Router } from './handlers';

const config: Route[][] = [
    [
        {
            path: "/blog", handler: (method, headers, params, query) => {
                // console.log({path: '/blog', headers, params, query});
                return Promise.resolve(true);
            },
        },
        {
            path: "/:id", handler: (method, headers, params, query) => {
                // console.log({path: '/:id', headers, params, query});
                return Promise.resolve(true);
            }
        },
    ],
    [
        {
            path: '/cv', handler: (method, headers, params, query) => {
                return Promise.resolve(true);
            }
        }
    ],
    [
        {
            path: '*', handler: (method, headers, params, query) => {
                return Promise.resolve(true);
            }
        }
    ],
];

const RESOURCE_SERVER_URL = process.env.RESOURCE_SERVER_URL || 'https://example.co';
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
