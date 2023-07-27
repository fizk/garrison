import {describe, expect, test} from '@jest/globals';
import { validateBasicAuth } from './basicAuth'
import { ValidationHandler } from '../handlers';
import type { IncomingHttpHeaders } from 'http';

describe('validateBasicAuth', () => {
    test('successful', async () => {
        const token = Buffer.from('username:password').toString('base64');
        const handler: ValidationHandler = await validateBasicAuth((username: string, password: string) => Promise.resolve(true));
        const headers: IncomingHttpHeaders  = {authorization: `Basic ${token}`};
        const response = await handler(['GET', headers, {}, {}]);
        expect(response).not.toBeNull();
        expect(response.at(4)).toEqual(['username', 'password']);
    });

    test('invalid username/password', async () => {
        const token = Buffer.from('username:password').toString('base64');
        const handler: ValidationHandler = await validateBasicAuth((username: string, password: string) => Promise.resolve(false));
        const headers: IncomingHttpHeaders  = {authorization: `Basic ${token}`};
        expect(handler(['GET', headers, {}, {}])).rejects.not.toBeNull()
    });

    test('invalid header', async () => {
        const token = Buffer.from('username:password').toString('base64');
        const handler: ValidationHandler = await validateBasicAuth((username: string, password: string) => Promise.resolve(true));
        const headers: IncomingHttpHeaders  = {authorization: `Bearer ${token}`};
        expect(handler(['GET', headers, {}, {}])).rejects.not.toBeNull()
    });

    test('no authorization header', async () => {
        const token = Buffer.from('username:password').toString('base64');
        const handler: ValidationHandler = await validateBasicAuth((username: string, password: string) => Promise.resolve(true));
        const headers: IncomingHttpHeaders  = {};
        expect(handler(['GET', headers, {}, {}])).rejects.not.toBeNull()
    });
});