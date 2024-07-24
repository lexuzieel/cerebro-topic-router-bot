import { Context } from "@mtkruto/node";
import { WithFilter } from "@mtkruto/node/script/client/0_filters";
import _ from "lodash";
import { Services } from "../types/services";
import { Topic } from "../types/topic";
import { handleCommand } from "./command";

export const handleTopic = async (
    ctx: WithFilter<Context, "message">,
    services: Services,
) => {
    const { client, keyv } = services;

    // If this is a topic message
    if (ctx.msg.replyToMessage) {
        const chat = ctx.chat;
        const topicsKey = `topics:${chat.id}`;

        // For each incoming message get the list of topics for the chat
        let topics: Topic[] = (await keyv.get(topicsKey)) || [];

        const topicName = _.get(
            ctx.msg.replyToMessage,
            "forumTopicCreated.name",
        );
        const topicId = ctx.msg.replyToMessageId;

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
                ctx.msg.chat.id,
                `Removed topic: <b>${topicName}</b>`,
                {
                    parseMode: "HTML",
                    replyTo: {
                        messageId: ctx.msg.replyToMessageId || 0,
                    },
                },
            );
        });

        await handleCommand(ctx, services, "add", async () => {
            topics = _.uniqBy([...topics, topic], t => t.name);

            await keyv.set(topicsKey, topics);

            await client.sendMessage(
                ctx.msg.chat.id,
                `Added topic: <b>${topicName}</b>`,
                {
                    parseMode: "HTML",
                    replyTo: {
                        messageId: ctx.msg.replyToMessageId || 0,
                    },
                },
            );
        });
    }
};
