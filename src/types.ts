export type Maybe<T> = T | null | undefined;

export type RequestValues<T> = [
    request: Request,
    params: Maybe<Record<string, Maybe<string>>>,
    args?: Maybe<T>,
];

export type ValidationHandler<T> = (requestValues: RequestValues<unknown>) => Promise<RequestValues<T>>;

export type ServeHandlerInfo = {remoteAddr: Deno.NetAddr};

export type Route = {
    // @see https://developer.chrome.com/articles/urlpattern/
    pattern: URLPattern
    handlers: ValidationHandler<unknown>[]
}

export interface Log  {
    info: (remoteAsddress: string, request: Request, response: Response, time: number) => void
    error: (remoteAsddress: string, request: Request, response: Response, time: number, error: Error) => void
}
