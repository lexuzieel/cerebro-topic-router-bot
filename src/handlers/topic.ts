import { Context } from "@mtkruto/node";
import _ from "lodash";
import { Services } from "../types/services.ts";
import { Topic } from "../types/topic.ts";
import { handleCommand } from "./command.ts";

export const handleTopic = async (ctx: Context, services: Services) => {
    const { client, keyv } = services;
    const { msg } = ctx;

    // If this is a topic message
    if (msg && msg.replyToMessage) {
        const topicsKey = `topics:${msg.chat.id}`;

        // For each incoming message get the list of topics for the chat
        let topics: Topic[] = (await keyv.get(topicsKey)) || [];

        const topicName = _.get(msg.replyToMessage, "forumTopicCreated.name");
        const topicId = msg.replyToMessageId;

        if (!topicName || !topicId) {
            return;
        }

        const topic: Topic = {
            name: topicName,
            id: topicId,
        };

        await handleCommand(ctx, services, "remove", async () => {
            topics = _.remove(topics, t => t.name !== topic.name);

            await keyv.set(topicsKey, topics);

            await client.sendMessage(
                msg.chat.id,
                `Removed topic: <b>${topicName}</b>`,
                {
                    parseMode: "HTML",
                    replyTo: {
                        messageId: msg.replyToMessageId || 0,
                    },
                },
            );
        });

        await handleCommand(ctx, services, "add", async () => {
            topics = _.uniqBy([...topics, topic], t => t.name);

            await keyv.set(topicsKey, topics);

            await client.sendMessage(
                msg.chat.id,
                `Added topic: <b>${topicName}</b>`,
                {
                    parseMode: "HTML",
                    replyTo: {
                        messageId: msg.replyToMessageId || 0,
                    },
                },
            );
        });
    }
};
