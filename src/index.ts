import { router } from './routes.ts';
import { server } from './server.ts';

const REMOTE_SERVER = Deno.env.get('REMOTE_SERVER') || '/';
const PORT = Deno.env.get('PORT') || 3030;

const KEY = Deno.env.get('SSH_KEY');
const CERT = Deno.env.get('SSH_CERT');

const log = {
    info: (remoteAsddress: string, request: Request, response: Response, time: number) => {
        console.log(
            `${remoteAsddress} - [${new Date().toJSON()}] "${request.method.toUpperCase()} ${request.url?.toString()} HTTP/1.1" ${response.status} ${time}`
        );
    },
    error: (remoteAsddress: string, request: Request, response: Response, time: number, error: Error) => {
        const errorArray: string[] = error.stack
                ? error.stack?.split(/\r\n|\n/).map(item => `"${item.replace('at ', '').trim()}"`)
                : []
        console.log(
            `${remoteAsddress} - [${new Date().toJSON()}] "${request.method.toUpperCase()} ${request.url?.toString()} HTTP/1.1" ${response.status} ${time} ${(error as Error)?.message} @ [${errorArray.join(', ')}]`
        );
    }
}

Deno.serve({
    cert: CERT,
    key: KEY,
    port: Number(PORT)
}, server(router, REMOTE_SERVER, log));
