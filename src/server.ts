
import { generateProxyServer, proxyServerHandler, proxyAction } from './handlers';
import type { Router } from './handlers';

export function startServer (router: Router, proxyServerProtocol: string, proxyServerPort: number, resourceServerURL: string, sslKey: string, sslCert: string) {
    const url = new URL(resourceServerURL);
    const proxyServer = generateProxyServer(
        proxyServerProtocol, 
        proxyServerHandler(router, proxyAction(sslKey, sslCert, url)),
        sslKey,
        sslCert,
    );
    proxyServer?.listen(proxyServerPort, () => {
        console.log(`${new Date().toJSON()} - Proxy Server ${proxyServerProtocol}://0.0.0.0:${proxyServerPort} running`);
        process.on('SIGINT', () => {
            console.log(`${new Date().toJSON()} - SIGINT`);
            proxyServer.close();
            process.exit();
        });
    });
    proxyServer.on('close', () => console.log(`${new Date().toJSON()} - CLOSED`));
    proxyServer.on('error', error => console.log(`${new Date().toJSON()} - ERROR ${error?.message}`));
}

