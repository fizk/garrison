import { assertEquals } from "https://deno.land/std@0.198.0/assert/mod.ts";
import { server } from '../src/server.ts';
import type { Route } from '../src/types.ts';

const log  = {
    info: (_remoteAsddress: string, _request: Request, _response: Response, _time: number) => {},
    error: (_remoteAsddress: string, _request: Request, _response: Response, _time: number, _error: Error) => {}
}

Deno.test('No routes match, returns a 406', async () => {
    const info = {
        remoteAddr : {
            transport: "tcp" as 'tcp' | 'udp',
            hostname: 'host',
            port: 3030,
        }
    };
    const request = new Request('http://url.com');
    const route: Route[] = [
        {
            pattern: new URLPattern({
                hostname: '*',
                pathname: '/does/not/match/1',
                search: '*'
            }),
            handlers: [
                () => Promise.resolve([request, undefined,])
            ]
        },
        {
            pattern: new URLPattern({
                hostname: '*',
                pathname: '/does/not/match/2',
                search: '*'
            }),
            handlers: [
                () => Promise.resolve([request, undefined,])
            ]
        }
    ];

    const response = await server(route, '', log)(request, info);

    assertEquals(response.status, 406);
});

Deno.test('Match found, access granted', async () => {
    globalThis.fetch = (): Promise<Response> => (
        Promise.resolve(new Response(undefined, {status: 200}))
    );

    const request = new Request('http://url.com/access')
    const info = {
        remoteAddr : {
            transport: "tcp" as 'tcp' | 'udp',
            hostname: 'host',
            port: 3030,
        }
    };
    const route: Route[] = [
        {
            pattern: new URLPattern({
                hostname: '*',
                pathname: '/access',
                search: '*'
            }),
            handlers: [
                () => Promise.resolve([request, undefined,])
            ]
        }
    ];
    

    const response = await server(route, 'http://external.com', log)(request, info);

    assertEquals(response.status, 200);
});

Deno.test('Match found, access denied, returns 401', async () => {
    globalThis.fetch = (): Promise<Response> => (
        Promise.resolve(new Response(undefined, {status: 200}))
    );

    const request = new Request('http://url.com/access')
    const info = {
        remoteAddr : {
            transport: "tcp" as 'tcp' | 'udp',
            hostname: 'host',
            port: 3030,
        }
    };
    const route: Route[] = [
        {
            pattern: new URLPattern({
                hostname: '*',
                pathname: '/access',
                search: '*'
            }),
            handlers: [
                () => {throw new Error('No access')}
            ]
        }
    ];
    

    const response = await server(route, 'http://external.com', log)(request, info);

    assertEquals(response.status, 401);
});