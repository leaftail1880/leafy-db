/**
 * @typedef {string|number|boolean} StringLike
 */
export class DatabaseManager {
    /**
     *
     * @param {string} pathToRepository - In format https://github.com/leaftail1880/db/blob/ KEEP / IN END OF LINE!
     */
    constructor(pathToRepository: string);
    tables: {};
    /** @type {import("./types.js").Gitrows} */
    DB: import("./types.js").Gitrows;
    isClosed: boolean;
    pathToRepo: string;
    Database: DatabaseWrapper;
    /**
     *
     * @param {string} postfix
     * @param {number} total
     * @example ```js
     * import { DatabaseManager } from "leafy-db"
     *
     * // External packages
     * import { SingleBar } from "cli-progress"
     * import { clearLines } from "leafy-utils"
     *
     * const manager = new DatabaseManager()
     *
     * manager.renderer = () => {
     *   const bar = new SingleBar({
     *     format: `[{bar}] {percentage}% - {value}/{total} ${postfix}`,
     * 	   barCompleteChar: "#",
     * 	   barIncompleteChar: "..",
     * 	   hideCursor: true,
     *   });
     *
     *   bar.start(total, 0);
     *   const originalStop = bar.stop
     *   bar.stop = () => {
     *     originalStop()
     *     clearLines(-1)
     *   }
     *   return bar
     * }
     * ```
     */
    renderer(postfix: string, total: number): {
        /**
         *
         * @param {number} n
         */
        increment(n?: number): void;
        stop(): void;
        getProgress(): void;
        getTotal(): void;
    };
    /**
     *
     * @param {string} pathToFile Path to file in repo (like test.json or dir/otherdir/path.json) DONT USE ./
     * @returns
     */
    CreateTable(pathToFile: string): DatabaseWrapper;
    connect(): Promise<void>;
    launchCommitTimer(): void;
}
export type StringLike = string | number | boolean;
declare class DatabaseWrapper {
    /**
     * @param {DatabaseManager} parent
     */
    constructor(parent: DatabaseManager, pathToFile?: string);
    /** @type {Function[]} */
    commitWaitQuene: Function[];
    _: {
        db: DatabaseWrapper;
        /**
         * Trying to connect db and shows progress to console
         */
        connect(): Promise<void>;
        /**
         * Reconects to client
         */
        reconnect(): Promise<void>;
        /**
         * Closes client and quits
         */
        close(): Promise<void>;
    };
    /**
     *
     * @template T
     * @param {T} value
     * @returns {Promise<T>}
     */
    waitForCommit<T>(value: T): Promise<T>;
    get isClosed(): boolean;
    /**
     * Забирает данные с кэша
     * @param {StringLike} key
     * @returns {string | boolean | number | any}
     */
    get(key: StringLike): string | boolean | number | any;
    /**
     *
     * @param {StringLike} key
     * @returns
     */
    getWork(key: StringLike): {
        data: any;
        save: () => Promise<boolean>;
    };
    /**
     * Запрашивает данные с датабазы
     * @param {StringLike} key
     * @returns {Promise<boolean>}
     */
    delete(key: StringLike): Promise<boolean>;
    /**
     * Устанавливает данные в базу данных
     * @param {StringLike} key
     * @param {string | boolean | Object} value
     * @returns
     */
    set(key: StringLike, value: string | boolean | any): Promise<boolean>;
    /**
     * @param {StringLike} key
     * @returns {boolean}
     */
    has(key: StringLike): boolean;
    /**
     * It returns an array of all the keys in the cache
     * @returns The keys of the cache object.
     */
    keys(): string[];
    /**
     * It returns a collection of all the keys and values in the cache
     * @returns
     */
    collection(): Record<string, any>;
    #private;
}
export {};
//# sourceMappingURL=index.d.ts.map