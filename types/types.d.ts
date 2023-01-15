export interface AbstractDatabase<K extends string | number | symbol, V extends unknown> {
    get(key: K): Promise<V>;
    set(key: K, value: V): Promise<any>;
    del(key: K): Promise<any>;
    keys(...filters: any): Promise<K[]>;
    exists?: (key: K) => Promise<number | boolean>;
    has?: (key: K) => Promise<number | boolean>;
    isOpen: boolean;
    ping(): Promise<any>;
    connect(): Promise<any>;
    quit(): Promise<any>;
}
export declare class Gitrows {
    constructor(options?: any);
    reset(): this;
    pull(path: string): Promise<any>;
    push(path: string, obj?: any, sha?: any, method?: string): Promise<any>;
    create(path: string, obj?: any): Promise<any>;
    drop(path: string): Promise<any>;
    get(path: string, query?: any, method?: "fetch" | "pull"): Promise<any>;
    put(path: string, data: any): Promise<any>;
    update(path: string, data: any, query?: any): Promise<any>;
    replace(path: string, data: any): Promise<any>;
    delete(path: string, query?: any): Promise<any>;
    columns(path: string): Promise<any>;
    types(path: string, query?: any): Promise<any>;
    options(obj: any): {};
    test(path: string, constraint?: {}): Promise<any>;
}
//# sourceMappingURL=types.d.ts.map