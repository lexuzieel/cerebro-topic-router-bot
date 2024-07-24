import { Context } from "@mtkruto/node";
import _ from "lodash";
import { Services } from "../types/services.js";

export const handleCommand = async (
    ctx: Context,
    services: Services,
    command: string | string[],
    handler: (ctx: Context, services: Services) => Promise<void>,
) => {
    const username = ctx.me?.username || "";
    const message = _.get(ctx.msg, "text");
    const mentioned =
        username == message?.slice(1, (ctx.me?.username?.length || 0) + 1);

    const text = message?.slice((ctx.me?.username?.length || 0) + 2);

    if (mentioned) {
        const commands = _.isArray(command) ? command : [command];

        for (const command of commands) {
            if (
                (!command && text?.length == 0) ||
                (command && text?.toLowerCase() === command.toLowerCase())
            ) {
                console.log(
                    `Command triggered by mentioning @${username}: ${command}`,
                );

                return await handler(ctx, services);
            }
        }
    }
};
