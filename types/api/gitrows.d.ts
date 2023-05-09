export default Gitrows;
export type FileLoc = import("../index.js").Repository & {
    path: string;
};
export type DBValue = Record<string, any>;
/**
 * @typedef {import("../index.js").Repository & {path: string}} FileLoc
 */
/**
 * @typedef {Record<string, any>} DBValue
 */
/**
 * Main class to manage requests
 */
declare class Gitrows {
    /**
     * @param {Partial<Gitrows["_"]> & Pick<Gitrows["_"], "token" | "user">} options
     */
    constructor(options: Partial<Gitrows["_"]> & Pick<Gitrows["_"], "token" | "user">);
    _: {
        message: string;
        author: {
            name: string;
            email: string;
        };
        /** @type {string} */
        token: string;
        /** @type {string} */
        user: string;
    };
    /**
     * @param {FileLoc} path
     * @returns {Promise<{size: number, sha: string, content: string}>}
     */
    pull(path: FileLoc): Promise<{
        size: number;
        sha: string;
        content: string;
    }>;
    /**
     * @param {FileLoc} to
     * @param {DBValue | null} obj
     * @param {string | null} sha
     */
    push(to: FileLoc, obj: DBValue | null, sha: string | null, method?: string): Promise<any>;
    /**
     * @param {FileLoc} path
     */
    create(path: FileLoc, obj?: {}): Promise<any>;
    /**
     * @param {FileLoc} path
     */
    drop(path: FileLoc): Promise<any>;
    /**
     * @param {FileLoc} to
     */
    get(to: FileLoc): Promise<any>;
    /**
     * @param {FileLoc} path
     * @param {DBValue} data
     */
    replace(path: FileLoc, data: DBValue): Promise<any>;
    /**
     * @param {import("../index.js").Repository} path
     */
    test(path: import("../index.js").Repository): Promise<any>;
}
//# sourceMappingURL=gitrows.d.ts.map