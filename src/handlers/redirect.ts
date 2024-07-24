import { Context } from "@mtkruto/node";
import { WithFilter } from "@mtkruto/node/script/client/0_filters";
import _ from "lodash";
import { Services } from "../types/services";
import { Topic } from "../types/topic";
import { yn } from "../utils/yn";

let previousTopic: Topic | undefined;

export const handleRedirect = async (
    ctx: WithFilter<Context, "message">,
    services: Services,
) => {
    const { client, keyv } = services;
    const { me, msg, chat } = ctx;

    const isCerebroBot =
        yn(process.env.REDIRECT_FROM_ANYONE) ||
        ctx.from?.username == "CerebrohqBot";

    // If the message is not from Cerebro bot - skip the handler
    if (!isCerebroBot) {
        return;
    }

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

    // If there is no parsed topic, then attempt
    // to send the message to the to the previous topic
    if (!parsedTopic && previousTopic) {
        const params = {
            caption: _.get(msg, "caption") || undefined,
            captionEntities: _.get(msg, "captionEntities"),
            replyTo: {
                messageId: previousTopic.id,
            },
        };

        const video = _.get(msg, "video.fileId", "");
        const audio = _.get(msg, "audio.fileId", "");
        const photo = _.get(msg, "photo.fileId", "");
        const document = _.get(msg, "document.fileId", "");

        if ("video" in msg) {
            await client.sendVideo(chat.id, video, params);
        } else if ("audio" in msg) {
            await client.sendAudio(chat.id, audio, params);
        } else if ("photo" in msg) {
            await client.sendPhoto(chat.id, photo, params);
        } else if ("document" in msg) {
            await client.sendDocument(chat.id, document, params);
        }

        return;
    }

    // Look through each subscribed topics
    for (const topic of topics) {
        // If the topic name does not match skip the topic
        if (topic.name.toLocaleLowerCase() != parsedTopic.toLocaleLowerCase()) {
            continue;
        }

        previousTopic = topic;

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
