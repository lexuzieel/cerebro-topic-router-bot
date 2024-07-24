import { Client, Context } from "@mtkruto/node";
import { WithFilter } from "@mtkruto/node/script/client/0_filters";
import Keyv from "keyv";
import _ from "lodash";
import { Services } from "../types/services";

export const handleCommand = async (
    ctx: WithFilter<Context, "message">,
    services: Services,
    command: string | string[],
    handler: (
        ctx: WithFilter<Context, "message">,
        services: Services,
    ) => Promise<void>,
) => {
    const message = _.get(ctx.msg, "text");
    const mentioned =
        ctx.me?.username ==
        message?.slice(1, (ctx.me?.username?.length || 0) + 1);

    const text = message?.slice((ctx.me?.username?.length || 0) + 2);

    if (mentioned) {
        const commands = _.isArray(command) ? command : [command];

        for (const command of commands) {
            if (
                (!command && text?.length == 0) ||
                (command && text?.toLowerCase() === command.toLowerCase())
            ) {
                console.log(`Command '${command}' triggered by mention`);

                return await handler(ctx, services);
            }
        }
    }
};
