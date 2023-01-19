import Gitrows from "gitrows";

/**
 * @typedef {string|number|boolean} StringLike
 */

export class DatabaseManager {
	/** @type {Record<string, DatabaseWrapper>} */
	tables = {};
	isClosed = false;
	/** @type {import("./types.js").Gitrows} */
	GitDB;

	/**
	 * Creates new DatabaseManager
	 * @param {object} options
	 * @param {string} options.repositoryURL - In format https://github.com/leaftail1880/db/blob/master/
	 * KEEP "/" IN THE END OF LINE!
	 * @param {string} options.token Token with access to given repo (like "github_pat...")
	 * @param {string} options.username Keep empty for gitlab. Token's owner username
	 * @param {DatabaseManager["renderer"]} [options.renderer] Specify renderer in options instead
	 * of rewriting it by manager.renderer = ...
	 * @param {string} [options.db_filename="db.json"] Custom name for main db file
	 * @param {object} [options.commit] Adnvanced AutoCommit settings
	 * @param {number} [options.commit.minQueneSize] Minimal size for table quene to trigger commit. Default 1.
	 * @param {number} [options.commit.timerTime] Time in MS to wait until commit. Default is 1000 * 30
	 * @param {boolean} [options.reconnect] Auto-reconnect on fecth errors
	 */
	constructor(options) {
		this.GitDB = new Gitrows({
			token: options.token,
			user: options.username,
		});

		if (options.renderer) this.renderer = options.renderer;
		this.options = {
			pathToRepo: options.repositoryURL,
			commit: {
				queneSize: options.commit?.minQueneSize ?? 1,
				timerTime: options.commit?.timerTime ?? 1000 * 30,
			},
		};

		this.Database = this.CreateTable(options.db_filename ?? "db.json");
	}
	/**
	 * Creates a table to work with file on given path
	 * @param {string} pathToFile - Path to file in repo (like test.json or dir/otherdir/path.json) DONT USE ./
	 * @returns A table.
	 */
	CreateTable(pathToFile) {
		const table = new DatabaseWrapper(this, pathToFile);
		this.tables[pathToFile] = table;
		return table;
	}
	/**
	 * Connects to the database and downloads all data of all tables to their cache
	 */
	async Connect() {
		const bar = this.renderer("tables connected", Object.keys(this.tables).length);

		for (const table of Object.values(this.tables)) {
			try {
				await table._.connect();
			} catch (e) {
				bar.stop();
				throw e;
			}
			bar.increment();
		}

		bar.stop();
	}
	/**
	 * Commits all tables if their quene length is more than this.minCommitQueneSize
	 */
	async commitAll() {
		await Promise.all(
			Object.values(this.tables).map((table) => {
				if (table.commitWaitQuene.length < this.options.commit.queneSize) return;
				return table._.commit();
			})
		);
	}

	/**
	 * Creates a renderer to render long proccess in console. By default, renderer is disanled.
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
			/** @param {number} step */
			increment(step = 1) {},
			stop() {},
			getProgress() {},
			getTotal() {},
		};
	}
}

/**
 * @template [V=any] Save value of db. You can specify it to use type-safe db
 */
class DatabaseWrapper {
	#Manager;
	#FileURL;
	/** @type {Record<string, V>} */
	#сache_store = {};

	get #Cache() {
		if (this._.isConnected) return this.#сache_store;
		throw new Error("You need to connect db using Manager.connect()!");
	}
	set #Cache(v) {
		this.#сache_store = v;
	}

	/** @type {Function[]} */
	commitWaitQuene = [];

	_ = {
		/** @private */
		t: this,

		isConnected: false,

		/**
		 * Trying to connect db and shows progress to console
		 */
		async connect() {
			const bar = this.t.#Manager.renderer("getting keys", 15);

			const int = setInterval(() => {
				if (bar.getProgress() <= bar.getTotal()) bar.increment();
			}, 10);

			try {
				this.t.#Cache = await this.t.#Manager.GitDB.get(this.t.#FileURL);
			} catch (e) {
				clearInterval(int);
				throw e;
			}

			if (!this.t.#Cache) {
				console.log("No file found at", this.t.#FileURL);
				await this.createTableFile();
				this.t.#Cache = {};
				this.isConnected = true;
			}

			clearInterval(int);
			bar.stop();
		},
		/**
		 * Reconects to db
		 */
		async reconnect() {
			await this.t.#Manager.GitDB.test(this.t.#FileURL);
			this.t.#Manager.isClosed = false;
		},
		/**
		 * Closes db and stop any commiting
		 */
		async close() {
			this.t.#Manager.isClosed = true;
		},
		/**
		 * Commits all db changes
		 */
		async commit() {
			await this.t.#Manager.GitDB.replace(this.t.#FileURL, this.t.#Cache);
			await Promise.all(this.t.commitWaitQuene.map((e) => e()));
			this.t.commitWaitQuene = [];
		},
		createTableFile() {
			return this.t.#Manager.GitDB.create(this.t.#FileURL);
		},
		dropTableFile() {
			return this.t.#Manager.GitDB.drop(this.t.#FileURL);
		},
		openCommitTimer() {
			if (this.commitTimer) return;

			this.commitTimer = setInterval(async () => {
				if (this.t.#Manager.isClosed) return;
				await this.commit();
				delete this.commitTimer;
			}, this.t.#Manager.options.commit.timerTime);
		},
		commitTimer: null,
	};
	/**
	 * @param {DatabaseManager} parent
	 */
	constructor(parent, pathToFile = "") {
		this.#Manager = parent;
		this.#FileURL = this.#Manager.options.pathToRepo + pathToFile;
	}
	/**
	 * Wait until commit and then returns given value
	 * @template T
	 * @param {T} value
	 * @returns {Promise<T>}
	 */
	waitForCommit(value) {
		if (this.#Manager.isClosed) throw new Error("DB is closed");
		this._.openCommitTimer();
		return new Promise((r) => {
			this.commitWaitQuene.push(() => r(value));
		});
	}
	/**
	 * Checks if timer of dbManager is closed
	 */
	get isClosed() {
		return this.#Manager.isClosed;
	}
	/**
	 * Getting data from cache
	 * @param {StringLike} key
	 * @returns {V}
	 */
	get(key) {
		key = key + "";
		return this.#Cache[key];
	}
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
	work(key) {
		const data = this.get(key);
		const T = this;

		return {
			data,
			save: () => T.set(key, data),
		};
	}
	/**
	 * Deleting data from cache and return promise that will resolve on commit
	 * @param {StringLike} key
	 * @returns {Promise<boolean>}
	 */
	delete(key) {
		const value = Reflect.deleteProperty(this.#Cache, key + "");
		return this.waitForCommit(value);
	}
	/**
	 * Setting data to cache and return promise that will resolve on commit
	 * @param {StringLike} key
	 * @param {V} value
	 * @returns
	 */
	set(key, value) {
		key = key + "";
		this.#Cache[key] = value;
		return this.waitForCommit(true);
	}
	/**
	 * Checks if cache has key
	 * @param {StringLike} key
	 * @returns {boolean}
	 */
	has(key) {
		key = "" + key;
		return key in this.#Cache;
	}
	/**
	 * Returns an array of all keys in the cache
	 * @returns The keys of the cache object.
	 */
	keys() {
		return Object.keys(this.#Cache);
	}
	/**
	 * Returns a collection of all keys and values in the cache
	 * @returns
	 */
	collection() {
		return this.#Cache;
	}
}
