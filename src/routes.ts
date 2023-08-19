import { validateJWT, getKeyFromEnv } from './validators/jwt.ts';
import { validateBasicAuth, getBasicAuthFromEnv,  } from './validators/basicAuth.ts';
import type { Route } from './types.ts';

export const router: Route[] = [
    {
        pattern: new URLPattern({
            hostname: '*',
            pathname: '/basic-auth',
            search: '*'
        }),
        handlers: [
            validateBasicAuth(getBasicAuthFromEnv)
        ]
    },
    {
        pattern: new URLPattern({
            hostname: '*',
            pathname: '/jwt',
            search: '*'
        }),
        handlers: [
            validateJWT(getKeyFromEnv)
        ]
    },
    {
        pattern: new URLPattern({
            hostname: '*',
            pathname: '/cv',
            search: '*'
        }),
        handlers: [
            ([request, params, args]) => {
                if (request.method !== 'GET') throw new Error(`${request.method} not accepted`)
                return Promise.resolve([request, params, args]);
            },
            validateJWT(getKeyFromEnv)
        ]
    },
    {
        pattern: new URLPattern({
            hostname: '*',
            pathname: '/',
            search: '*'
        }),
        handlers: [
            ([request, params, args]) => Promise.resolve([request, params, args])
        ]
    },

];
