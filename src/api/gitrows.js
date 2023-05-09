// @ts-check

import fetch from "node-fetch";
import descriptions from "./codes.js";

/**
 * @param {number} code
 */
function Response(code) {
	return {
		code,
		description: descriptions[code] ?? descriptions[428],
	};
}

/** @param {string} string */
const btoa = (string) => Buffer.from(string, "utf-8").toString("base64");
/** @param {string} string */
const atob = (string) => Buffer.from(string, "base64").toString("utf-8");

/**
 * @param {FileLoc} path
 */
function toApi(path) {
	if (!path.ns || path.ns === "github") {
		return `https://api.github.com/repos/${path.owner}/${path.repo}/contents/${path.path}`;
	}

	const project = encodeURIComponent(path.owner + "/" + path.repo);
	path.path = encodeURIComponent(path.path);
	return `https://gitlab.com/api/v4/projects/${project}/repository/files/${path.path}`;
}

/**
 * @typedef {import("../index.js").Repository & {path: string}} FileLoc
 */

/**
 * @typedef {Record<string, any>} DBValue
 */

/**
 * Main class to manage requests
 */
class Gitrows {
	_ = {
		message: "GitRows API Post (https://gitrows.com)",
		author: { name: "GitRows", email: "api@gitrows.com" },
		/** @type {string} */
		token: null,
		/** @type {string} */
		user: null,
	};
	/**
	 * @param {Partial<Gitrows["_"]> & Pick<Gitrows["_"], "token" | "user">} options
	 */
	constructor(options) {
		this._ = {
			message: "GitRows API Post (https://gitrows.com)",
			author: { name: "GitRows", email: "api@gitrows.com" },
			...options,
		};
	}
	/**
	 * @param {FileLoc} path
	 * @returns {Promise<{size: number, sha: string, content: string}>}
	 */
	async pull(path) {
		if (!path.path) Promise.reject(Response(400));

		/** @type {Record<string, string>} */
		let headers = {};

		if (
			this._.user !== undefined &&
			this._.token !== undefined &&
			path.ns === "github"
		)
			headers["Authorization"] =
				"Basic " + btoa(this._.user + ":" + this._.token);

		let url = toApi(path);
		if (path.ns === "gitlab") url += "?ref=" + path.branch;

		const r = await fetch(url, {
			headers,
		});

		if (!r.ok) Promise.reject(Response(r.status));
		const json = r.json();
		if (!json) Promise.reject(Response(r.status));

		// @ts-expect-error
		return json;
	}
	/**
	 * @param {FileLoc} to
	 * @param {DBValue | null} obj
	 * @param {string | null} sha
	 */
	async push(to, obj, sha, method = "PUT") {
		if (!this._.token) Promise.reject(Response(401));
		if (!to.path) Promise.reject(Response(400));
		const body = {
			branch: to.branch,
		};

		if (typeof obj === "object" && obj !== null)
			body.content = btoa(JSON.stringify(obj, null, 2));

		if (sha) body.sha = sha;

		const headers = {
			"Content-Type": "application/json",
		};
		switch (to.ns) {
			case "gitlab":
				headers["Authorization"] = "Bearer " + this._.token;
				body.encoding = "base64";
				body.commit_message = this._.message;
				body.author_name = this._.author.name;
				body.author_email = this._.author.email;
				break;
			case "github":
				headers["Authorization"] =
					"Basic " + btoa(this._.user + ":" + this._.token);
				body.message = this._.message;
				body.committer = this._.author;
				break;
			default:
				Promise.reject(Response(501));
				break;
		}
		const r = await fetch(toApi(to), {
			method: method,
			headers: headers,
			body: JSON.stringify(body),
		});
		if (!r.ok) Promise.reject(Response(r.status));
		return Response(r.status);
	}
	/**
	 * @param {FileLoc} path
	 */
	create(path, obj = {}) {
		return this.push(path, obj, null, path.ns === "gitlab" ? "POST" : "PUT");
	}
	/**
	 * @param {FileLoc} path
	 */
	async drop(path) {
		return this.push(
			path,
			null,
			path.ns === "github" ? (await this.pull(path)).sha : null,
			"DELETE"
		);
	}
	/**
	 * @param {FileLoc} to
	 */
	async get(to) {
		const { content } = await this.pull(to);
		return JSON.parse(atob(content));
	}
	/**
	 * @param {FileLoc} path
	 * @param {DBValue} data
	 */
	async replace(path, data) {
		const { sha } = await this.pull(path);
		await this.push(path, data, sha);
		return Response(202);
	}

	/**
	 * @param {import("../index.js").Repository} path
	 */
	async test(path) {
		if (!path.repo) return Promise.reject(Response(404));
		if (path.ns !== "github") return Promise.reject(Response(501));

		const headers = {
			"Content-Type": "application/json",
		};

		if (this._.user && this._.token)
			headers["Authorization"] =
				"Basic " + btoa(this._.user + ":" + this._.token);

		const r = await fetch(
			"https://api.github.com/repos/" + path.owner + "/" + path.repo,
			{ headers }
		);

		if (!r.ok) {
			Promise.reject(Response(404));
		}
	}
}

export default Gitrows;

