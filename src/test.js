import { DatabaseManager } from "./index.js";

const Manager = new DatabaseManager({
	repositoryURL: "https://github.com/leaftail1880/db/blob/",
	token: "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",
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
	await Manager.Connect();
	console.log("Connected");

	console.log(await database.set("key2", { e: 113 }));
}
main().catch(console.log);
