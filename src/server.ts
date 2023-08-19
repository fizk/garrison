// import {v1 as uuid} from "https://deno.land/std@0.194.0/uuid/mod.ts";
import type { ValidationHandler, RequestValues, Route, Maybe, ServeHandlerInfo, Log } from './types.ts';



const compose = (...functions: ValidationHandler<unknown>[]) => (input: RequestValues<unknown>) => {
    return functions.reduceRight((chain, func) => chain.then(func), Promise.resolve(input))
};

export const server = (router: Route[], remoteServer: string, log: Log) => async (request: Request, connInfo: ServeHandlerInfo) => {
    const t0 = performance.now();
    const handlers: ValidationHandler<unknown>[] = [];
    let params: Maybe<Record<string, Maybe<string>>> = null;

    for (const item of router) {
        if (item.pattern.test(request.url)) {
            params = item.pattern?.exec(request.url)?.pathname.groups;
            handlers.push(...item.handlers);
            break;
        }
    }

    if (handlers.length === 0) {
        const response = new Response("Not Acceptable", { status: 406 });
        log.error(connInfo.remoteAddr.hostname, request, response, performance.now() - t0, new Error('Not Acceptable'));
        return response;
    }

    const res = await compose(...handlers, )([request, params, null])
        .then(async () => {
            const url = new URL(request.url);
            // request.headers. append('x-transaction-id', String(uuid.generate()))
            const remoteRequest = new Request(`${remoteServer}${url.pathname}${url.search}`, {
                method: request.method,
                body: request.body,
                headers: request.headers,
                keepalive: true,
                referrer: 'https://reverse-proxy'
            })
            const remoteResponse = await fetch(remoteRequest);
            log.info(connInfo.remoteAddr.hostname, request, remoteResponse, performance.now() - t0);
            return remoteResponse;
        })
        .catch((error: Error) => {
            const remoteResponse = new Response(`${error.message}`, { status: 401 });
            log.error(connInfo.remoteAddr.hostname, request, remoteResponse, performance.now() - t0, error);
            return remoteResponse;
        });

    return res;
}