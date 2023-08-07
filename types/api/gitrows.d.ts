export default GitDB;
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
declare class GitDB {
    /**
     * @param {Partial<GitDB["_"]> & Pick<GitDB["_"], "token" | "user">} options
     */
    constructor(options: Partial<GitDB["_"]> & Pick<GitDB["_"], "token" | "user">);
    _: {
        message: string;
        author: {
            name: string;
            email: string;
        };
        /** @type {string | null} */
        token: string | null;
        /** @type {string | null} */
        user: string | null;
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
    push(to: FileLoc, obj: DBValue | null, sha: string | null, method?: string): Promise<string>;
    /**
     * @param {FileLoc} path
     */
    create(path: FileLoc, obj?: {}): Promise<string>;
    /**
     * @param {FileLoc} path
     */
    drop(path: FileLoc): Promise<string>;
    /**
     * @param {FileLoc} to
     */
    get(to: FileLoc): Promise<any>;
    /**
     * @param {FileLoc} path
     * @param {DBValue} data
     */
    replace(path: FileLoc, data: DBValue): Promise<string>;
    /**
     * @param {import("../index.js").Repository} path
     */
    test(path: import("../index.js").Repository): Promise<string>;
}
//# sourceMappingURL=gitrows.d.ts.map