import {describe, expect, test} from '@jest/globals';
import { validateJWT } from './jwt'
import { ValidationHandler } from '../handlers';
import { SignJWT } from 'jose';
import { createSecretKey } from 'crypto';
import type { IncomingHttpHeaders } from 'http';

describe('validateJWT', () => {
    test('successful', async () => {
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJibG9nOnJlYWQiOmZhbHNlfQ.vK3MXpmTnSjleoOl9vWY-1PH88hI1vgOz8Tx8RSMkNg';
        const secret = '123';
        const handler: ValidationHandler = await validateJWT(() => Promise.resolve(secret));
        const headers: IncomingHttpHeaders  = {
            authorization: `Bearer ${token}`
        };
        const response = await handler(['GET', headers, {}, {}]);
        expect(response).not.toBeNull();
        expect(response.at(4)).toEqual({'blog:read': false});
    });

    test('invalid token', async () => {
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJibG9nOnJlYWQiOmZhbHNlfQ.vK3MXpmTnSjleoOl9vWY-1PH88hI1vgOz8Tx';
        const secret = '123';
        const handler: ValidationHandler = await validateJWT(() => Promise.resolve(secret));
        const headers: IncomingHttpHeaders  = {
            authorization: `Bearer ${token}`
        };
        expect(handler(['GET', headers, {}, {}])).rejects.not.toBeNull();
    });

    test('invalid secret', async () => {
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJibG9nOnJlYWQiOmZhbHNlfQ.vK3MXpmTnSjleoOl9vWY-1PH88hI1vgOz8Tx8RSMkNg';
        const secret = 'invalid';
        const handler: ValidationHandler = await validateJWT(() => Promise.resolve(secret));
        const headers: IncomingHttpHeaders  = {
            authorization: `Bearer ${token}`
        };
        expect(handler(['GET', headers, {}, {}])).rejects.not.toBeNull();
    });

    test('invalid header', async () => {
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJibG9nOnJlYWQiOmZhbHNlfQ.vK3MXpmTnSjleoOl9vWY-1PH88hI1vgOz8Tx8RSMkNg';
        const secret = '123';
        const handler: ValidationHandler = await validateJWT(() => Promise.resolve(secret));
        const headers: IncomingHttpHeaders  = {
            authorization: `Basic ${token}`
        };
        expect(handler(['GET', headers, {}, {}])).rejects.not.toBeNull();
    });

    test('no authorization header', async () => {
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJibG9nOnJlYWQiOmZhbHNlfQ.vK3MXpmTnSjleoOl9vWY-1PH88hI1vgOz8Tx8RSMkNg';
        const secret = '123';
        const handler: ValidationHandler = await validateJWT(() => Promise.resolve(secret));
        const headers: IncomingHttpHeaders  = {};
        expect(handler(['GET', headers, {}, {}])).rejects.not.toBeNull();
    });

    test('exp has expired', async () => {
        const secret = '123';
        const secretKey = createSecretKey(secret, 'utf-8');
        const token = await new SignJWT({ id: '12345' })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime(Math.trunc(Date.now() / 1000) - 100)
            .sign(secretKey);
        
        const handler: ValidationHandler = await validateJWT(() => Promise.resolve(secret));
        const headers: IncomingHttpHeaders  = {authorization: `Bearer ${token}`};
        expect(handler(['GET', headers, {}, {}])).rejects.not.toBeNull();
    });

    test('exp is still valid', async () => {
        const secret = '123';
        const secretKey = createSecretKey(secret, 'utf-8');
        const token = await new SignJWT({ id: '12345' })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime(Math.trunc(Date.now() / 1000) + 100)
            .sign(secretKey);
        
        const handler: ValidationHandler = await validateJWT(() => Promise.resolve(secret));
        const headers: IncomingHttpHeaders  = {authorization: `Bearer ${token}`};
        const response = await handler(['GET', headers, {}, {}]);
        expect(response).not.toBeNull();
    });
});