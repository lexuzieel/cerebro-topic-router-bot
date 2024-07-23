import dotenv from "dotenv";
import readline from "readline";

dotenv.config();

import { Client, StorageLocalStorage } from "@mtkruto/node";
import _ from "lodash";
import Keyv from "keyv";
import KeyvFile from "keyv-file";
import { handleTopic } from "./handlers/topic";
import { handleRedirect } from "./handlers/redirect";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const client = new Client({
  storage: new StorageLocalStorage("storage/mtkruto-session"),
  apiId: Number(process.env.API_ID),
  apiHash: process.env.API_HASH,
});

const keyv = new Keyv({
  store: new KeyvFile({
    filename: "./storage/kv.json",
  }),
});

const services = {
  client,
  keyv,
};

(async () => {
  if (process.env.AUTH_STRING) {
    await client.importAuthString(process.env.AUTH_STRING);
    await client.start();
  } else {
    await client.start({
      phone: () =>
        new Promise((resolve) =>
          rl.question("Enter your phone number: ", resolve)
        ),
      code: () =>
        new Promise((resolve) =>
          rl.question("Enter the code you received: ", resolve)
        ),
      password: () =>
        new Promise((resolve) =>
          rl.question("Enter your account's password: ", resolve)
        ),
    });

    console.log("Update AUTH_STRING environment variable and try again:\n");
    console.log(await client.exportAuthString());

    process.exit(0);
  }

  client.on("message", async (ctx) => {
    await handleTopic(ctx, services);
    await handleRedirect(ctx, services);
  });
})();
