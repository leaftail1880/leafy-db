/**
 * @typedef {string|number|boolean} StringLike
 */
/**
 * @typedef {object} Repository
 * @prop {string} options.repository.owner - Owner of repository
 * @prop {string} options.repository.repo - Repository name
 * @prop {string} options.repository.branch - Repository branch
 * @prop {'github' | 'gitlab'} ns - A
 */
export class DatabaseManager {
    /**
     * Creates new DatabaseManager
     * @param {object} options
     * @param {Repository} options.repository
     * @param {string} options.token Token with access to given repo (like "github_pat...")
     * @param {string} options.username Keep empty for gitlab. Token's owner username
     * @param {DatabaseManager["renderer"]} [options.renderer] Specify renderer in options instead
     * of rewriting it by manager.renderer = ...
     * @param {object} [options.commit] Adnvanced AutoCommit settings
     * @param {number} [options.commit.minQueneSize] Minimal size for table quene to trigger commit. Default 1.
     * @param {number} [options.commit.timerTime] Time in MS to wait until commit. Default is 1000 * 30
     * @param {boolean} [options.reconnect] Auto-reconnect on fecth errors
     */
    constructor(options: {
        repository: Repository;
        token: string;
        username: string;
        renderer?: DatabaseManager["renderer"];
        commit?: {
            minQueneSize?: number;
            timerTime?: number;
        };
        reconnect?: boolean;
    });
    /** @type {Record<string, DatabaseWrapper>} */
    tables: Record<string, DatabaseWrapper>;
    isClosed: boolean;
    GitDB: Gitrows;
    /**
     * Creates a renderer to render long proccess in console. By default, renderer is disabled.
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
        /** @param {number} step */
        increment(step?: number): void;
        stop(): void;
        getProgress(): void;
        getTotal(): void;
    };
    options: {
        repository: Repository;
        commit: {
            queneSize: number;
            timerTime: number;
        };
    };
    /**
     * Creates a table to work with file on given path
     * @param {string} pathToFile - Path to file in repo (like test.json or dir/otherdir/path.json) DONT USE ./
     * @returns A table.
     */
    CreateTable(pathToFile: string): DatabaseWrapper<any>;
    /**
     * Connects to the database and downloads all data of all tables to their cache
     */
    Connect(): Promise<void>;
    /**
     * Reconects to db
     */
    Reconnect(): Promise<void>;
    /**
     * Closes db and stop any commiting
     */
    Close(): void;
    /**
     * Commits all tables if their quene length is more than this.minCommitQueneSize
     */
    commitAll(): Promise<void>;
}
/**
 * @template [V=any] Save value of db. You can specify it to use type-safe db
 */
export class DatabaseWrapper<V = any> {
    /**
     * @param {DatabaseManager} parent
     */
    constructor(parent: DatabaseManager, pathToFile?: string);
    /** @type {Function[]} */
    commitWaitQuene: Function[];
    _: {
        /** @private */
        t: DatabaseWrapper<V>;
        isConnected: boolean;
        /**
         * Trying to connect db and shows progress to console
         */
        connect(): any;
        /**
         * Commits all db changes
         */
        commit(): Promise<void>;
        createTableFile(): Promise<any>;
        dropTableFile(): Promise<any>;
        openCommitTimer(): void;
        /** @private */
        commitTimer: any;
        /**
         * @template {keyof typeof this["events"]} EventName
         * @param {EventName} event
         * @param {typeof this["events"][EventName]} callback
         */
        on<EventName extends "beforeSet" | "beforeGet">(event: EventName, callback: {
            /**
             * This function will trigger until key set to db and can be used to modify data. For example, remove default values to keep db clean and lightweigth
             * @param {StringLike} key
             * @param {V} value
             * @returns {V}
             */
            beforeSet(key: StringLike, value: V): V;
            /**
             * This function will trigger until key get from db and can be used to modify data. For example, add default values to keep db clean and lightweigth
             * @param {StringLike} key
             * @param {V} value
             * @returns {V}
             */
            beforeGet(key: StringLike, value: V): V;
        }[EventName]): void;
        /** @private */
        events: {
            /**
             * This function will trigger until key set to db and can be used to modify data. For example, remove default values to keep db clean and lightweigth
             * @param {StringLike} key
             * @param {V} value
             * @returns {V}
             */
            beforeSet(key: StringLike, value: V): V;
            /**
             * This function will trigger until key get from db and can be used to modify data. For example, add default values to keep db clean and lightweigth
             * @param {StringLike} key
             * @param {V} value
             * @returns {V}
             */
            beforeGet(key: StringLike, value: V): V;
        };
    };
    /**
     * Wait until commit and then returns given value
     * @template T
     * @param {T} value
     * @returns {Promise<T>}
     */
    waitForCommit<T>(value: T): Promise<T>;
    /**
     * Checks if timer of dbManager is closed
     */
    get isClosed(): boolean;
    /**
     * Getting data from cache
     * @param {StringLike} key
     * @returns {V}
     */
    get(key: StringLike): V;
    /**
     * Shorthand for db.get(); and db.set(); pair
     * @param {StringLike} key
     * @example ```js
     * // Get work
     * const {data, save} = db.work(key)
     *
     * // Change values
     * data.value = 10
     *
     * data.obj = { value2: 1 }
     *
     * // Save without specify key and data
     * save()
     * ```
     */
    work(key: StringLike): {
        data: V;
        save: () => Promise<boolean>;
    };
    /**
     * Deleting data from cache and return promise that will resolve on commit
     * @param {StringLike} key
     * @returns {Promise<boolean>}
     */
    delete(key: StringLike): Promise<boolean>;
    /**
     * Setting data to cache and return promise that will resolve on commit
     * @param {StringLike} key
     * @param {V} value
     * @returns
     */
    set(key: StringLike, value: V): Promise<boolean>;
    /**
     * Checks if cache has key
     * @param {StringLike} key
     * @returns {boolean}
     */
    has(key: StringLike): boolean;
    /**
     * Returns an array of all keys in the cache
     * @returns The keys of the cache object.
     */
    keys(): string[];
    /**
     * Returns a collection of all keys and values in the cache
     * @returns
     */
    collection(): {
        [k: string]: V;
    };
    /**
     * Retursn all values in the cache
     */
    values(): V[];
    #private;
}
export type StringLike = string | number | boolean;
export type Repository = {
    /**
     * - Owner of repository
     */
    owner: string;
    /**
     * - Repository name
     */
    repo: string;
    /**
     * - Repository branch
     */
    branch: string;
    /**
     * - A
     */
    ns: 'github' | 'gitlab';
};
import Gitrows from "./api/gitrows.js";
//# sourceMappingURL=index.d.ts.map