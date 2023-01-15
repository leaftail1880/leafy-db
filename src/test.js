import { DatabaseManager } from "./index.js";

const Manager = new DatabaseManager("");

export const database = Manager.Database;
export const tables = {
	users: Manager.CreateTable("users.json"),
	groups: Manager.CreateTable("groups.json"),
};
