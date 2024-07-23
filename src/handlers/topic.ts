import { Client, Context } from "@mtkruto/node";
import _ from "lodash";
import Keyv from "keyv";
import KeyvFile from "keyv-file";
import { WithFilter } from "@mtkruto/node/script/client/0_filters";
import { Topic } from "../topic";

export const handleTopic = async (
  ctx: WithFilter<Context, "message">,
  services: {
    client: Client;
    keyv: Keyv;
  }
) => {
  const { client, keyv } = services;

  // If this is a topic message
  if (ctx.msg.replyToMessage) {
    const chat = ctx.chat;
    const topicsKey = `topics:${chat.id}`;

    // For each incoming message get the list of topics for the chat
    let topics: Topic[] = (await keyv.get(topicsKey)) || [];

    const topicName = _.get(ctx.msg.replyToMessage, "forumTopicCreated.name");
    const topicId = ctx.msg.replyToMessageId;

    if (!topicName || !topicId) {
      return;
    }

    const topic: Topic = {
      name: topicName,
      id: topicId,
    };

    const message = _.get(ctx.msg, "text");
    const mentioned =
      ctx.me?.username ==
      message?.slice(1, (ctx.me?.username?.length || 0) + 1);

    const text = message?.slice((ctx.me?.username?.length || 0) + 2);

    if (mentioned) {
      switch (text?.toLowerCase()) {
        case "forget": {
          topics = _.remove(topics, (t) => t.name !== topic.name);

          await keyv.set(topicsKey, topics);

          await client.sendMessage(
            ctx.msg.chat.id,
            `Removed topic: <b>${topicName}</b>`,
            {
              parseMode: "HTML",
              replyTo: {
                messageId: ctx.msg.replyToMessageId || 0,
              },
            }
          );

          break;
        }
        default: {
          topics = _.uniqBy([...topics, topic], (t) => t.name);

          await keyv.set(topicsKey, topics);

          await client.sendMessage(
            ctx.msg.chat.id,
            `Added topic: <b>${topicName}</b>`,
            {
              parseMode: "HTML",
              replyTo: {
                messageId: ctx.msg.replyToMessageId || 0,
              },
            }
          );
        }
      }
    }
  }
};
