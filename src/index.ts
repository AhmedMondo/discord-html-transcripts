import { AttachmentBuilder, version, Collection, type Channel, type Message, type TextBasedChannel } from 'discord.js';
import renderMessages from './generator';
import {
  ExportReturnType,
  type CreateTranscriptOptions,
  type GenerateFromMessagesOptions,
  type ObjectType,
} from './types';

// version check
if (version.split('.')[0] !== '14') {
  console.error(
    `[discord-html-transcripts] Versions v3.x.x of discord-html-transcripts are only compatible with js v14.x.x, and you are using v${version}.` +
      `    Please install discord-html-transcripts v2.x.x using "npm install discord-html-transcripts@^2".`
  );
  process.exit(1);
}

/**
 *
 * @param channel  The channel the messages are from
 * @param limit    The limit of Messages to be Fetched
 * @returns        The generated messages
 */
async function fetchManager(channel, limit = Infinity) {
  if (!channel) {
    throw new Error(`Expected channel, got ${typeof channel}.`);
  }
  if (limit <= 100) {
    return channel.messages.fetch({ limit });
  }

  let collection = new Collection();
  let lastId = null;
  let options = {};
  let remaining = limit;

  while (remaining > 0) {
    options.limit = remaining > 100 ? 100 : remaining;
    remaining = remaining > 100 ? remaining - 100 : 0;

    if (lastId) {
      options.before = lastId;
    }

    let messages = await channel.messages.fetch(options);

    if (!messages.last()) {
      break;
    }

    collection = collection.concat(messages);
    lastId = messages.last().id;
  }
  return collection.reverse()
}


/**
 *
 * @param messages The messages to generate a transcript from
 * @param channel  The channel the messages are from (used for header and guild name)
 * @param options  The options to use when generating the transcript
 * @returns        The generated transcript
 */
export async function generateFromMessages<T extends ExportReturnType = ExportReturnType.Attachment>(
  messages: Message[] | Collection<string, Message>,
  channel: Channel,
  options: GenerateFromMessagesOptions<T> = {}
): Promise<ObjectType<T>> {
  // turn messages into an array
  const transformedMessages = messages instanceof Collection ? Array.from(messages.values()) : messages;

  // const startTime = process.hrtime();

  // render the messages
  const html = await renderMessages({
    messages: transformedMessages,
    channel,
    saveImages: options.saveImages ?? false,
    callbacks: {
      resolveChannel: async (id) => channel.client.channels.fetch(id).catch(() => null),
      resolveUser: async (id) => channel.client.users.fetch(id).catch(() => null),
      resolveRole: channel.isDMBased() ? () => null : async (id) => channel.guild?.roles.fetch(id).catch(() => null),

      ...(options.callbacks ?? {}),
    },
    poweredBy: options.poweredBy ?? true,
    favicon: options.favicon ?? 'guild',
  });

  // get the time it took to render the messages
  // const renderTime = process.hrtime(startTime);
  // console.log(`[discord-html-transcripts] Rendered ${transformedMessages.length} messages in ${renderTime[0]}s ${renderTime[1] / 1000000}ms`);

  // return the html in the specified format
  if (options.returnType === ExportReturnType.Buffer) {
    return Buffer.from(html) as unknown as ObjectType<T>;
  }

  if (options.returnType === ExportReturnType.String) {
    return html as unknown as ObjectType<T>;
  }

  return new AttachmentBuilder(Buffer.from(html), {
    name: options.filename ?? `transcript-${channel.id}.html`,
  }) as unknown as ObjectType<T>;
}

/**
 *
 * @param channel The channel to create a transcript from
 * @param options The options to use when creating the transcript
 * @returns       The generated transcript
 */
export async function createTranscript<T extends ExportReturnType = ExportReturnType.Attachment>(
  channel: TextBasedChannel,
  options: CreateTranscriptOptions<T> = {}
): Promise<ObjectType<T>> {
  // validate type
  if (!channel.isTextBased()) {
    // @ts-expect-error(2339): run-time check
    throw new TypeError(`Provided channel must be text-based, received ${channel.type}`);
  }

  // fetch messages
  const allMessages: Message[] = [];
  let lastMessageId: string | undefined;

  // until there are no more messages, keep fetching
  // eslint-disable-next-line no-constant-condition
  while (true) {
     // fetch from function above
  let fetchedMessages = await fetchManager()
  }

  // generate the transcript
  return generateFromMessages<T>(fetchedMessages, channel, options);
}

export default {
  createTranscript,
  generateFromMessages,
};
export * from './types';
