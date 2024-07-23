import readline from "readline";
import { Client, StorageLocalStorage } from "@mtkruto/node";
import dotenv from "dotenv";
import Keyv from "keyv";
import KeyvFile from "keyv-file";
import _ from "lodash";
import { handleCommand } from "./handlers/command";
import { handleRedirect } from "./handlers/redirect";
import { handleTopic } from "./handlers/topic";

dotenv.config();

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
                new Promise(resolve =>
                    rl.question("Enter your phone number: ", resolve),
                ),
            code: () =>
                new Promise(resolve =>
                    rl.question("Enter the code you received: ", resolve),
                ),
            password: () =>
                new Promise(resolve =>
                    rl.question("Enter your account's password: ", resolve),
                ),
        });

        console.log("Update AUTH_STRING environment variable and try again:\n");
        console.log(await client.exportAuthString());

        process.exit(0);
    }

    client.on("message", async ctx => {
        if (ctx.chat.type != "supergroup") {
            console.warn(`Chat ${ctx.chat.id} is not a supergroup`);
            return;
        }

        await handleTopic(ctx, services);
        await handleRedirect(ctx, services);

        await handleCommand(ctx, services, "help", async ctx => {
            const replyTo = ctx.msg.replyToMessageId
                ? {
                      messageId: ctx.msg.replyToMessageId,
                  }
                : undefined;

            await client.sendMessage(ctx.msg.chat.id, "<help message>", {
                replyTo,
            });
        });
    });
})();
