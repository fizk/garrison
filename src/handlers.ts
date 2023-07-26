import { createServer as httpServer, request as getHttp } from 'http';
import { request as getHttps, createServer as httpsServer } from 'node:https';
import { hrtime } from 'node:process';
import type { IncomingMessage, ServerResponse } from 'http';
import type { IncomingHttpHeaders } from 'http';

export type Maybe<T> = T | null | undefined;

export type ValidationHandler = (
    method: Maybe<string>, 
    headers: IncomingHttpHeaders, 
    params: Maybe<Record<string, string>>, 
    query: Maybe<Record<string, string> | undefined>
) => Promise<boolean>;

export interface Router {
    recognize: (path: string) => Results
}

export interface Route {
    path: string
    handler: ValidationHandler
}

export interface Results extends ArrayLike<Maybe<Result>> {
    queryParams: Record<string, Maybe<any[] | any>>;
}

export interface Result {
    params: Record<string, string>
    handler: ValidationHandler
}

export function generateProxyServer(
    protocol: string, 
    handler: (request: IncomingMessage, response: ServerResponse) => void,
    key?: string,
    cert?: string,
) {
    if (protocol.toLowerCase() === 'http') {
        return httpServer(handler);
    }
    else if (protocol.toLowerCase() === 'https') {
        return httpsServer({key, cert}, handler);
    }
    else {
        throw new Error(`Protocol ${protocol} not support, only HTTP and HTTPS`);
    }
}

export  const proxyServerHandler = (router: Router, proxyAction: (request: IncomingMessage, response: ServerResponse) => Promise<void>) => async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const start = hrtime.bigint();

    const routerResult = router.recognize(request.url!);

    if (!routerResult || routerResult.length === 0) {
        response.statusCode = 403;
        response.end();
        console.log(`${new Date().toJSON()} - ${request.method} ${request.url?.toString()} 403 - ${hrtime.bigint() - start}ns Invalid path`);
        return;
    }

    const verifyResult: boolean[] = await Promise.all(
        Array.from(routerResult).map(result => {
            if (!result?.handler) return Promise.resolve(false);
            return result.handler(
                request.method,
                request.headers, 
                result.params, 
                routerResult.queryParams
            );
        })
    );

    const isValid = verifyResult.every(verify => verify === true);

    if (!isValid) {
        response.statusCode = 401;
        response.end();
        console.log(`${new Date().toJSON()} - ${request.method} ${request.url?.toString()} 401 - ${hrtime.bigint() - start}ns Access denied`);
        return;
    }
    
    proxyAction(request, response).then(() => {
        console.log(`${new Date().toJSON()} - ${request.method} ${request.url?.toString()} ${response.statusCode} - ${hrtime.bigint() - start}ns`);
    }).catch(error => {
        console.log(`[${new Date().toJSON()}] ${request.method} ${request.url?.toString()} ${response.statusCode} - ${hrtime.bigint() - start}ns ${error?.message}`);
    });
}

export const proxyAction = (sslKey: string, sslCert: string, resourceServeryURL: URL) => (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const client = resourceServeryURL.protocol === 'http:'
        ? getHttp
        : getHttps

    return new Promise( async (pass, fail) => {

        const body: Buffer = await new Promise((requestBodySuccess,requestBodyFailure) => {
            let b: Uint8Array[] = [];
            request.on('data', chunk => b.push(chunk));
            request.on('end', () => requestBodySuccess(Buffer.concat(b)));
            request.on('error', error => requestBodyFailure(error));
        });
        
        const headers = {
            ...Object.entries(request.headers).reduce<Record<string, string>>((previous, [key, value]) => {
                if (!value) return previous;
                previous[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : value;
                return previous;
            }, {}),
            host: resourceServeryURL.host,
            'content-length': body.byteLength,
            // X-Forwarded-For: <client>, <proxy1>, <proxy2>
            // 'X-Forwarded-For': request.socket.remoteAddress,
            // 'X-Forwarded-Host': request.headers.host,
            // // X-Forwarded-Proto: <protocol>
            // 'X-Forwarded-Proto': request
        };

        
        const options = {
            hostname: resourceServeryURL.hostname,
            port: resourceServeryURL.port,
            path: request.url,
            method: request.method,
            key: sslKey,
            cert: sslCert,
            agent: false,
            headers: headers,
            protocol: resourceServeryURL.protocol, 
            timeout: 100,
            // joinDuplicateHeaders: true,
            // _defaultAgent?: Agent | undefined;
            // auth?: string | null | undefined;
            // // https://github.com/nodejs/node/blob/master/lib/_http_client.js#L278
            // createConnection?:
            //     | ((options: ClientRequestArgs, oncreate: (err: Error, socket: Socket) => void) => Socket)
            //     | undefined;
            // defaultPort?: number | string | undefined;
            // family?: number | undefined;
            // hints?: LookupOptions['hints'];
            // host?: string | null | undefined;
            // insecureHTTPParser: true,
            // localAddress?: string | undefined;
            // localPort?: number | undefined;
            // lookup?: LookupFunction | undefined;
            // /**
            //  * @default 16384
            //  */
            // maxHeaderSize?: number | undefined;
            // setHost?: boolean | undefined;
            // signal?: AbortSignal | undefined;
            // socketPath?: string | undefined;
            // uniqueHeaders?: Array<string | string[]> | undefined;
        }

        const clientRequest = client(options, res => {
    
            response.statusCode = res.statusCode || 200;
            Object.entries(res.headers).forEach(([key, value]) => response.setHeader(key, value || ''));
            
            res.on('data', chunk => {
                response.write(chunk);
            });
            res.on('end', () => {
                response.end();
                pass(undefined);
            });
        });
        
        clientRequest.on('error', error => {
            response.statusCode = 500;
            response.end();
            fail(error);
        });
    
        clientRequest.write(body);
        clientRequest.end();
    });
    
}