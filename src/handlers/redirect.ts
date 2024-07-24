import { Context, Message } from "@mtkruto/node";
import _ from "lodash";
import PQueue from "p-queue";
import pRetry from "p-retry";
import { Services } from "../types/services.js";
import { Topic } from "../types/topic.js";
import { yn } from "../utils/yn.js";

let linkedTopic: Topic | undefined;

const queue = new PQueue({ concurrency: 1 });

const waitUpToSeconds = async (seconds: number) => {
    const minimum = 500;
    const delay =
        minimum + Math.round((seconds * 1000 - minimum) * Math.random());

    await new Promise(resolve => setTimeout(resolve, delay));
};

const enqueueTask = (task: () => Promise<void>) => {
    queue.add(async () => {
        await waitUpToSeconds(1);

        await pRetry(
            async () => {
                try {
                    await task();
                } catch (error) {
                    if (
                        _.get(error, "errorMessage", "").startsWith(
                            "FLOOD_WAIT",
                        )
                    ) {
                        const seconds = _.get(error, "seconds", 0) + 1;

                        console.warn(
                            `Got flood error - waiting for ${seconds} seconds...`,
                        );

                        await new Promise(resolve =>
                            setTimeout(resolve, seconds * 1000),
                        );

                        throw error;
                    } else {
                        console.warn("Failed to send message - skipping", error);
                    }
                }
            },
            {
                onFailedAttempt: error => {
                    console.log(
                        `Trying again - ${error.retriesLeft} attempts left`,
                    );
                },
                retries: 3,
            },
        );
    });
};

const redirectMessage = async (
    services: Services,
    msg: Message,
    topic: Topic,
    text: string,
) => {
    const { client } = services;

    console.log(`Redirecting message ${msg.id} to topic: ${topic.name}`);

    const finalText = `${text}\n↩️ <a href="${msg.link}">General</a>`;

    await client.sendMessage(msg.chat.id, finalText, {
        parseMode: "HTML",
        entities: _.get(msg, "entities") || [],
        replyTo: {
            messageId: topic.id,
        },
    });
};

const redirectLinkedMessage = async (services: Services, msg: Message) => {
    const { client } = services;

    if (!linkedTopic) {
        return;
    }

    console.log(
        `Redirecting message ${msg.id} to linked topic: ${linkedTopic?.name}`,
    );

    const params = {
        caption: _.get(msg, "caption") || undefined,
        captionEntities: _.get(msg, "captionEntities"),
        replyTo: {
            messageId: linkedTopic.id,
        },
    };

    const video = _.get(msg, "video.fileId", "");
    const audio = _.get(msg, "audio.fileId", "");
    const photo = _.get(msg, "photo.fileId", "");
    const document = _.get(msg, "document.fileId", "");

    if ("video" in msg) {
        await client.sendVideo(msg.chat.id, video, params);
    } else if ("audio" in msg) {
        await client.sendAudio(msg.chat.id, audio, params);
    } else if ("photo" in msg) {
        await client.sendPhoto(msg.chat.id, photo, params);
    } else if ("document" in msg) {
        await client.sendDocument(msg.chat.id, document, params);
    }
};

export const handleRedirect = async (ctx: Context, services: Services) => {
    const { keyv } = services;
    const { me, msg } = ctx;

    const isCerebroBot =
        yn(process.env.REDIRECT_FROM_ANYONE) ||
        ctx.from?.username == "CerebrohqBot";

    // If the message is not from Cerebro bot - skip the handler
    if (!isCerebroBot) {
        return;
    }

    // If this is a topic message skip the handler
    if (!msg || msg.replyToMessage || msg.from?.id === me?.id) {
        return;
    }

    const text = _.get(msg, "text") || "";
    const topicsKey = `topics:${msg.chat.id}`;

    // For each incoming message get the list of topics for the chat
    let topics: Topic[] = (await keyv.get(topicsKey)) || [];

    // Parse topic from the message text
    const lines = text.split("\n");
    // Topic name is on the second line
    const parsedTopic = lines[1]?.trim() || "";

    // If there is no parsed topic, then attempt
    // to send the message to the to the previous topic
    if (!parsedTopic) {
        enqueueTask(async () => {
            await redirectLinkedMessage(services, msg);
        });

        return;
    }

    // Look through each subscribed topics
    for (const topic of topics) {
        // If the topic name does not match skip the topic
        if (topic.name.toLocaleLowerCase() != parsedTopic.toLocaleLowerCase()) {
            continue;
        }

        // Otherwise send the message to the corresponding topic
        enqueueTask(async () => {
            await redirectMessage(services, msg, topic, text);
            linkedTopic = topic;
        });
    }
};
