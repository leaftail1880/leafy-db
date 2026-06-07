import GitDB from "./api/gitrows.js";

/**
 * Represents error
 */
export class LeafyDBError extends Error {}

/**
 * @param {string} url Url of repository in format:
 * `https://github.com/<user>/<repo>/blob/<branch>/`
 * `https://github.com/<user>/<repo>` - Branch defaults to `master`
 * @returns {Repository}
 */
export function Github(url) {
	let host, pathname;
	try {
		({ host, pathname } = new URL(url));
	} catch (e) {
		// Show what was passed to url arg. Usually caused when env doesn't loaded
		throw new LeafyDBError("Failed to parse url: '" + url + "'", { cause: e });
	}

	if (host !== "github.com")
		throw new LeafyDBError("Invalid url host: " + host);

	const match = pathname.match(
		/^\/(?<owner>[^\/]+)\/(?<repo>[^\/]+)\/?(?:blob\/(?<branch>[^\/]+)\/?)?/,
	);
	if (!match?.groups || !match.groups.owner || !match.groups.repo)
		throw new LeafyDBError("Invalid url pathname: " + pathname);

	const { owner, repo, branch = "master" } = match.groups;

	return { owner, repo, branch, ns: "github" };
}

/**
 * @typedef {string | number | boolean} StringLike
 */

/**
 * @typedef {object} Repository
 * @prop {string} owner - Owner of repository
 * @prop {string} repo - Repository name
 * @prop {string} branch - Repository branch
 * @prop {'github' | 'gitlab'} ns - Repository host
 */

export class LeafyDBManager {
	/** @type {Record<string, LeafyDBTable>} */
	tables = {};
	closed = true;
	GitDB;

	/**
	 * Creates new DatabaseManager
	 * @param {object} options
	 * @param {Repository} options.repository
	 * @param {string} options.token Token with access to given repo (like "github_pat...")
	 * @param {string} [options.username] Token's owner username. Defaults to `repository.owner`. Keep empty for gitlab.
	 * @param {LeafyDBManager["renderer"]} [options.renderer] Specify renderer in options instead
	 * of rewriting it by `manager.renderer = ...`
	 * @param {object} [options.commit] Adnvanced AutoCommit settings
	 * @param {number} [options.commit.minQueneSize] Minimal size for table quene to trigger commit. Default is 1.
	 * @param {number} [options.commit.timerTime] Time in MS to wait until commit. Default is 1000 * 30
	 * @param {boolean} [options.reconnect] Auto-reconnect on fetch errors
	 * @param {import('undici-types').Dispatcher} [options.dispatcher]
	 */
	constructor(options) {
		if (!options.username && options.repository.ns === "github") {
			options.username = options.repository.owner;
		}

		this.GitDB = new GitDB({
			token: options.token,
			user: options.username ?? null,
			dispatcher: options.dispatcher,
		});

		if (options.renderer) this.renderer = options.renderer;
		this.options = {
			repository: options.repository,
			commit: {
				queneSize: options.commit?.minQueneSize ?? 1,
				timerTime: options.commit?.timerTime ?? 1000 * 30,
			},
		};
	}
	/**
	 * Creates a DatabaseTable to work with file on given path
	 * @template [V=any] - DB table value type.
	 * @param {string} pathToFile - Path to file in repo (like test.json or dir/otherdir/path.json) DONT USE ./
	 * @param {Partial<Events<V>>} [events]
	 * @returns {LeafyDBTable<V>} A table.
	 */
	table(pathToFile, events) {
		const table = new LeafyDBTable(this, pathToFile, events);
		this.tables[pathToFile] = table;
		return table;
	}
	/**
	 * Connects to the database and downloads all data of all tables to their cache
	 */
	async connect() {
		const tables_to_connect = Object.values(this.tables).filter(
			(e) => !e.isConnected,
		);
		if (tables_to_connect.length < 1) return;

		const bar = this.renderer("tables connected", tables_to_connect.length);

		for (const table of tables_to_connect) {
			try {
				await table.connect();
			} catch (cause) {
				bar.stop();
				throw new LeafyDBError("Failed to connect", { cause });
			}
			bar.increment();
		}

		bar.stop();
		this.closed = false;
	}
	/**
	 * Reconects to db
	 */
	async reconnect() {
		await this.GitDB.test(this.options.repository);
		this.closed = false;
	}
	/**
	 * Commits all tables if their quene length is more than this.minCommitQueneSize
	 */
	async commitAll() {
		for (const table of Object.values(this.tables)) {
			await table.commit();
		}
	}

	/**
	 * Creates a renderer to show long processes in console. By default, renderer is disabled.
	 * @param {string} postfix
	 * @param {number} total
	 * @example ```js
	 * import { LeafyManager } from "leafy-db"
	 *
	 * // External package
	 * import { SingleBar } from "cli-progress"
	 *
	 * const manager = new LeafyManager()
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
	 *
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
 * @template V
 * @typedef {{
 *   connect(): void;
 *   beforeSet(key: StringLike, value: V): V;
 *   beforeGet(key: StringLike, value: V): V;
 * }} Events
 */

/**
 * @template [V=any] Type of db value. You can specify it to use type-safe db
 */
export class LeafyDBTable {
	/** Database manager that created table */
	#m;
	/** Table file */
	#file;
	/** @type {Record<string, V>} */
	#сache_store = {};

	get #Cache() {
		if (this.isConnected) return this.#сache_store;
		throw new LeafyDBError("Not connected!");
	}
	set #Cache(v) {
		this.#сache_store = v;
	}

	/** @type {(() => void)[]} @protected */
	commitWaitQuene = [];

	isConnected = false;

	/**
	 * Trying to connect db and shows progress to console
	 */
	async connect() {
		let error = "";
		try {
			this.#Cache = await this.#m.GitDB.get(this.#file);
			this.isConnected = true;
		} catch (e) {
			if (e instanceof Error && e.message.includes("404")) {
				error = "[leafy-db] No file found at: " + this.#file.path;
			} else throw e;
		}

		if (!this.#сache_store) {
			console.log(
				error ?? "[leafy-db] No file content found at: " + this.#file.path,
			);
			await this.createTableFile();
			this.#Cache = {};
			this.isConnected = true;
		}

		setImmediate(() => this.events.connect());
	}
	/**
	 * Commits all db changes
	 */
	async commit() {
		await this.#m.GitDB.replace(this.#file, this.#Cache);
		await Promise.all(this.commitWaitQuene.map((e) => e()));
		this.commitWaitQuene = [];
	}
	createTableFile() {
		return this.#m.GitDB.create(this.#file);
	}
	deleteTableFile() {
		return this.#m.GitDB.drop(this.#file);
	}
	/**
	 * @protected
	 */
	openCommitTimer() {
		if (this.commitTimer) return;

		this.commitTimer = setInterval(async () => {
			if (this.#m.closed) return;
			await this.commit();
			clearInterval(this.commitTimer);
			delete this.commitTimer;
		}, this.#m.options.commit.timerTime);
	}
	/**
	 * @protected
	 * @type {ReturnType<typeof setInterval> | undefined}
	 */
	commitTimer = undefined;
	/**
	 * @template {keyof Events<V>} EventName
	 * @param {EventName} event
	 * @param {Events<V>[EventName]} callback
	 */
	on(event, callback) {
		this.events[event] = callback;
	}

	/**
	 * @type {Events<V>}
	 * @protected
	 */
	events = {
		connect() {},
		beforeSet(key, value) {
			return value;
		},
		beforeGet(key, value) {
			return value;
		},
	};

	/**
	 * @param {LeafyDBManager} parent
	 * @param {string} [pathToFile=""]
	 * @param {Partial<Events<V>>} [events]
	 */
	constructor(parent, pathToFile = "", events) {
		this.#m = parent;
		if (events) Object.assign(this.events, events);
		this.#file = { ...parent.options.repository, path: pathToFile };
	}

	/**
	 * Wait until commit and then returns given value
	 * @template T
	 * @param {T} value
	 * @returns {Promise<T>}
	 */
	waitForCommit(value) {
		if (this.#m.closed) throw new LeafyDBError("DB is closed");
		this.openCommitTimer();
		return new Promise((r) => {
			this.commitWaitQuene.push(() => r(value));
		});
	}
	/**
	 * Checks if timer of dbManager is closed
	 */
	get closed() {
		return this.#m.closed;
	}
	/**
	 * Getting data from cache
	 * @param {StringLike} key
	 * @returns {V}
	 */
	get(key) {
		key = key + "";
		const value = this.events.beforeGet(key, this.#Cache[key]);
		return value;
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
		value = this.events.beforeSet(key, value);
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
	 */
	keys() {
		return Object.keys(this.#Cache);
	}
	/**
	 * Returns a collection of all keys and values in the cache
	 */
	collection() {
		return Object.fromEntries(
			Object.entries(this.#Cache).map(([key, value]) => [
				key,
				this.events.beforeGet(key, value),
			]),
		);
	}
	/**
	 * Retursn all values in the cache
	 */
	values() {
		return Object.entries(this.#Cache).map(([key, value]) =>
			this.events.beforeGet(key, value),
		);
	}
}
