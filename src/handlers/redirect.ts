import { Context } from "@mtkruto/node";
import { WithFilter } from "@mtkruto/node/script/client/0_filters";
import _ from "lodash";
import { Topic } from "../topic";
import { Services } from "../types/services";

export const handleRedirect = async (
    ctx: WithFilter<Context, "message">,
    services: Services,
) => {
    const { client, keyv } = services;

    const { me, msg, chat } = ctx;

    // If this is a topic message skip the handler
    if (msg.replyToMessage || msg.from?.id === me?.id) {
        return;
    }

    const text = _.get(msg, "text") || "";
    const topicsKey = `topics:${chat.id}`;

    // For each incoming message get the list of topics for the chat
    let topics: Topic[] = (await keyv.get(topicsKey)) || [];

    // Parse topic from the message text
    const lines = text.split("\n");
    // Topic name is on the second line
    const parsedTopic = lines[1]?.trim() || "";

    // Look through each subscribed topics
    for (const topic of topics) {
        // If the topic name does not match skip the topic
        if (topic.name.toLocaleLowerCase() != parsedTopic.toLocaleLowerCase()) {
            continue;
        }

        const finalText = `${text}\n↩️ <a href="${msg.link}">General</a>`;

        // Otherwise send the message to the corresponding topic
        await client.sendMessage(chat.id, finalText, {
            parseMode: "HTML",
            entities: _.get(msg, "entities") || [],
            replyTo: {
                messageId: topic.id,
            },
        });
    }
};
