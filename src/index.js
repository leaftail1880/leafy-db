import Gitrows from "gitrows";

/**
 * @typedef {string|number|boolean} StringLike
 */

export class DatabaseManager {
  /** @type {Record<string, DatabaseWrapper>} */
	tables = {};
	/**
	 * Creates new DatabaseManager
	 * @param {object} options
	 * @param {string} options.repositoryURL - In format https://github.com/leaftail1880/db/blob/ 
	 * KEEP "/" IN THE END OF LINE!
	 * @param {string} options.token Token with access to given repo (like "github_pat...")
	 * @param {string} options.username Keep empty for gitlab. Token's owner username
	 * @param {DatabaseManager["renderer"]} [options.renderer] Specify renderer in options instead
	 * of rewriting it by manager.renderer = ...
	 * @param {string} [options.db_filename="db.json"] Custom name for main db file
	 * @param {number} [options.minCommitQueneSize] Minimal size for table quene to trigger commit. Default 1.
	 * @param {number} [options.CommitInterval] Time in MS to commit quene interval. Default is 1000 * 60
	 */
	constructor(options) {
		/** @type {import("./types.js").Gitrows} */
		this.DB = Gitrows({token: options.token, user: options.username});
		this.isClosed = false;
		this.pathToRepo = options.repositoryURL;

    if (options.renderer) this.renderer = options.renderer

		this.Database = this.CreateTable(options.db_filename ?? "db.json");
		
		this.minCommitQueneSize = options.minCommitQueneSize ?? 1
		this.commitInterval.time = options.CommitInterval ?? 1000 * 60
		this.commitInterval.open()
	}
	
	
	
	commitInterval = {
	  t: this,
	  time: 0,
	  committer() {
	    if (this.t.isClosed) return
	    this.t.commitAll()
	  },
	  open() {
	    this.interval = setInterval(this.committer, this.time)
	  }
	  close() {
	    clearInterval(this.interval)
	  }
	}
	/**
	 * Commits all tables if their quene length is more than this.minCommitQueneSize
	 */
	async commitAll() {
	  await Promise.all(Object.values(this.tables).forEach(table => {
		  if (table.commitWaitQuene.length < this.minCommitQueneSize) return
	    return table._.commit()
	  })
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
	async connect() {
	  const bar = this.renderer("tables connected", Object.keys(this.tables).length)
	  
		for (const table of Object.values(this.tables))	{
		  await table._.connect();
		  bar.increment()
		}
		
		bar.stop()
	}
}

/**
 * @template [V=any] Value of db. You can specify it to use type-safe db
 */
class DatabaseWrapper {
	#Parent;
	#FileURL;
	/** @type {Record<string, V>} */
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
		 * Reconects to db
		 */
		async reconnect() {
		  await this.db.#Parent.DB.test(this.db.#FileURL)
			this.db.#Parent.isClosed = false;
		},
		/**
		 * Closes db and stop any commiting
		 */
		async close() {
			this.db.#Parent.isClosed = true;
		},
		/**
		 * Commits all db changes
		 */
		async commit() {
		  await this.db.#Parent.DB.replace(this.#FileURL, this.db.#Cache)
		  await Promie.all(this.db.commitWaitQuene.forEach(e => e()))
		  this.db.commitWaitQuene = []
		}
	};
	/**
	 * @param {DatabaseManager} parent
	 */
	constructor(parent, pathToFile = "") {
		this.#Parent = parent;
		this.#FileURL = this.#Parent.pathToRepo + pathToFile;
	}
	/**
	 * Wait until commit and then returns given value
	 * @template T
	 * @param {T} value
	 * @returns {Promise<T>}
	 */
	waitForCommit(value) {
		if (this.#Parent.isClosed) throw new Error("DB is closed");
		return new Promise((r) => {
			this.commitWaitQuene.push(() => r(value));
		});
	}
	/**
	 * Checks if timer of dbManager is closed
	 */
	get isClosed() {
		return this.#Parent.isClosed;
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
