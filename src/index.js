import Gitrows from "gitrows";

/**
 * @typedef {string|number|boolean} StringLike
 */

export class DatabaseManager {
	tables = {};
	/**
	 *
	 * @param {string} pathToRepository - In format https://github.com/leaftail1880/db/blob/ KEEP / IN END OF LINE!
	 */
	constructor(pathToRepository) {
		/** @type {import("./types.js").Gitrows} */
		this.DB = Gitrows();
		this.isClosed = false;
		this.pathToRepo = pathToRepository;

		this.Database = new DatabaseWrapper(this);
	}

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
	renderer(postfix, total) {
		return {
			/**
			 *
			 * @param {number} n
			 */
			increment(n = 1) {},
			stop() {},
			getProgress() {},
			getTotal() {},
		};
	}

	/**
	 *
	 * @param {string} pathToFile Path to file in repo (like test.json or dir/otherdir/path.json) DONT USE ./
	 * @returns
	 */
	CreateTable(pathToFile) {
		const table = new DatabaseWrapper(this, pathToFile);
		this.tables[pathToFile] = table;
		return table;
	}
	async connect() {
		for (const db in this.tables) {
			await this.tables[db].connect();
		}
	}
	launchCommitTimer() {}
}

class DatabaseWrapper {
	#Parent;
	#FileURL;
	/** @type {Record<string, any>} */
	#Cache = {};

	/** @type {Function[]} */
	commitWaitQuene = [];

	_ = {
		db: this,
		/**
		 * Trying to connect db and shows progress to console
		 */
		async connect() {
			const bar = this.db.#Parent.renderer("getting keys", 15);

			const int = setInterval(() => {
				if (bar.getProgress() <= bar.getTotal()) bar.increment();
			}, 10);

			this.db.#Cache = await this.db.#Parent.DB.get(this.db.#FileURL);

			clearInterval(int);

			bar.stop();
		},
		/**
		 * Reconects to client
		 */
		async reconnect() {
			this.db.#Parent.isClosed = false;
		},
		/**
		 * Closes client and quits
		 */
		async close() {
			this.db.#Parent.isClosed = true;
		},
	};
	/**
	 * @param {DatabaseManager} parent
	 */
	constructor(parent, pathToFile = "") {
		this.#Parent = parent;
		this.#FileURL = this.#Parent.pathToRepo + pathToFile;
	}
	/**
	 *
	 * @template T
	 * @param {T} value
	 * @returns {Promise<T>}
	 */
	waitForCommit(value) {
		if (this.#Parent.isClosed) throw new Error("Custom client is closed");
		return new Promise((r) => {
			this.commitWaitQuene.push(() => r(value));
		});
	}
	get isClosed() {
		return this.#Parent.isClosed;
	}
	/**
	 * Забирает данные с кэша
	 * @param {StringLike} key
	 * @returns {string | boolean | number | any}
	 */
	get(key) {
		key = key + "";
		return this.#Cache[key];
	}
	/**
	 *
	 * @param {StringLike} key
	 * @returns
	 */
	getWork(key) {
		const data = this.get(key);
		const T = this;

		return {
			data,
			save: () => T.set(key, data),
		};
	}
	/**
	 * Запрашивает данные с датабазы
	 * @param {StringLike} key
	 * @returns {Promise<boolean>}
	 */
	delete(key) {
		const value = Reflect.deleteProperty(this.#Cache, key + "");
		return this.waitForCommit(value);
	}
	/**
	 * Устанавливает данные в базу данных
	 * @param {StringLike} key
	 * @param {string | boolean | Object} value
	 * @returns
	 */
	set(key, value) {
		key = key + "";
		this.#Cache[key] = value;
		return this.waitForCommit(true);
	}
	/**
	 * @param {StringLike} key
	 * @returns {boolean}
	 */
	has(key) {
		key = "" + key;
		return key in this.#Cache;
	}
	/**
	 * It returns an array of all the keys in the cache
	 * @returns The keys of the cache object.
	 */
	keys() {
		return Object.keys(this.#Cache);
	}
	/**
	 * It returns a collection of all the keys and values in the cache
	 * @returns
	 */
	collection() {
		return this.#Cache;
	}
}
