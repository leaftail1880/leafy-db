const token = "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";

import { DatabaseManager } from "./index.js";
const Manager = new DatabaseManager({
	repositoryURL: "https://github.com/leaftail1880/db/blob/master/",
	token,
	username: "leaftail1880",
	commitInterval: 1000 * 5,
});

export const database = Manager.Database;
export const tables = {
	users: Manager.CreateTable("users.json"),
	groups: Manager.CreateTable("groups.json"),
};

async function main() {
	console.log("Connecting...");
	try {
	await Manager.Connect();
	} catch (e) {
	  console.log("Connect err:", e)
	  return
	}
	console.log("Connected");

	console.log(await database.set("key2", { e: 113 }));
}
main().catch(e => console.log("Unhandled rejection:", e));
