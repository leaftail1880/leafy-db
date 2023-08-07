# Leafy-db

Use github as database. Powered by git api. Only one dependency: node-fetch@2.x || 3.x

## Instalation

```
yarn add leafy-db
```

or

```
npm i leafy-db
```

## Setup

1. Create private repository on github
2. Create personal access token with "Read/Write access to code and commit statuses" on created repo
3. Use the following code snippet:

```ts
import { LeafyManager, Github } from "leafy-db";

const database = LeafyManager({
  repository: Github(process.env.DB_REPO),
  token: process.env.DB_TOKEN,
});

const tables = {
  users: database.table<{ name: string }>("users.json"),
};

database.connect().then(() => {
  tables.users.get("admin").name // Get is sync because values stores in cache
  
  tables.users.set("admin", {name: "newname"}) // Returns promise that will expire after 60 seconds by default. That needed to decrease commit count.
})
```

## Gitlab support?

The only one problem with gitlab is that i have no idea how to test if repo exists. If you want to use my wrapper with gitlab, tell me, ill fix that. All other things to integrate are done already!