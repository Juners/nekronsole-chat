import {
  getEmotesetFrom7tv,
  ImageHostFile,
} from "./lib/integrations/seventv/api";
import {
  getAccessToken,
  getChatBadges,
  getGlobalBadges,
  getUserData,
} from "./lib/integrations/twitch/api";
import { EmoteData, setupChat } from "./lib/renders/chat-render";

import { setup } from "./main";

import "./style.css";

declare global {
  interface Console {
    chat: ReturnType<typeof setupChat>;
  }
  interface Window {
    Chat: Chat;
  }
  interface Chat {
    enter: (streamer: string) => void;
    exit: () => void;
  }
}

const devMode = false;

const badgesMap = new Map<string, Map<string, [string, string]>>();

function size2x(element: ImageHostFile) {
  return element.name === "2x";
}

async function login() {
  console.log("Logging in...");

  const app = document.querySelector("#app");
  if (!app) return; // TODO Maybe don't require app

  const access_token = await getAccessToken(app);
  if (!access_token) return;

  const { token, userId } = access_token;
  if (!(token && userId)) {
    console.error("An error occured, try reloading");
    return;
  }

  console.log("Logged in");

  // TODO: Don't store it, simply request it again
  localStorage.setItem("access_token", token);
  // THis one is fine
  localStorage.setItem("user_id", userId);

  return access_token;
}

async function enterChat({
  streamer_name,
  access_token,
  user_id,
}: {
  streamer_name: string;
  access_token: string;
  user_id: string;
}) {
  console.log("Loading some data, please wait...");

  const client_id = import.meta.env.VITE_CLIENT_ID;

  const streamerData = await getUserData(
    streamer_name,
    access_token,
    client_id
  );
  if (!streamerData) {
    console.error(`Couldn't find the streamer ${streamer_name}`);
    return;
  }

  const broadcaster_id = streamerData[0].id;

  const emojis = await getEmotesetFrom7tv(broadcaster_id);

  const emoteSetTransformed = Object.fromEntries(
    Array.from(emojis.values(), function (v) {
      const file = v.files.find(size2x) ?? v.files[0];
      return [
        v.alias,
        {
          alias: v.alias,
          image: { url: `https:${v.url}/${file.name}` },
        },
      ];
    })
  );

  const globalBadges = await getGlobalBadges(access_token, client_id);
  if (globalBadges) {
    for (let i = 0; i < globalBadges.length; i++) {
      const badge = globalBadges[i];

      const versionMap = new Map();
      for (let j = 0; j < badge.versions.length; j++) {
        const version = badge.versions[j];

        versionMap.set(version.id, [version.title, version.image_url_1x]);
      }

      badgesMap.set(badge.set_id, versionMap);
    }
  }

  const channelBadges = await getChatBadges(
    broadcaster_id,
    access_token,
    client_id
  );
  if (channelBadges) {
    for (let i = 0; i < channelBadges.length; i++) {
      const badge = channelBadges[i];

      const versionMap = new Map();
      for (let j = 0; j < badge.versions.length; j++) {
        const version = badge.versions[j];

        versionMap.set(version.id, [version.title, version.image_url_1x]);
      }

      badgesMap.set(badge.set_id, versionMap);
    }
  }

  const chat = setupChat(emoteSetTransformed, badgesMap);

  console.chat = chat;

  const stopListening = startListening({
    broadcaster_id,
    token: access_token,
    userId: user_id,
    devMode,
  });
  return stopListening;
}

function startListening({
  broadcaster_id,
  token,
  userId,
  devMode,
}: {
  broadcaster_id: string;
  token: string;
  userId: string;
  devMode: boolean;
}) {
  console.log("Connecting to the chat...");

  const { start, stop, eventBus } = setup(token, userId, devMode);

  eventBus.addEventListener("connected", () => {
    console.log("Connected to the chatroom");
  });

  eventBus.addEventListener("message", ({ detail }) => {
    // console.log(detail);
    // TODO: Do a bit of parsing
    const msg = detail.message.fragments
      .filter(({ type }) => ["text", "emote"].includes(type))
      .map(({ type, text, emote }) => {
        if (type === "text") {
          return text as string;
        } else if (type === "emote") {
          return {
            alias: text,
            image: {
              url: `https://static-cdn.jtvnw.net/emoticons/v2/${emote.id}/default/dark`,
            },
          } as EmoteData;
        }
      });

    const obj = {
      from: {
        name: detail.chatter_user_name,
        color: detail.color,
        badges: detail.badges,
      },
      time: detail.timestamp,
      message: msg,
    };

    console.chat(obj);
  });

  eventBus.addEventListener("disconnected", () => {
    console.log("Left the chatroom");
  });

  start(broadcaster_id);

  return stop;
}

async function main() {
  if ("chat" in globalThis.console) {
    console.error("chat is already in use!");
  } else {
    const data = await login();
    if (!data) {
      console.error("Error loging in");
      return;
    }

    if (!window.Chat) {
      let chat_name: string | null = null;
      let leaveChat: (() => void) | undefined | null = null;

      window.Chat = {
        enter: function (streamer_name: string) {
          if (typeof streamer_name !== "string") {
            console.error("You must provide a valid streamer name");
          }

          if (leaveChat) {
            this.exit();
          }

          chat_name = streamer_name;

          console.log("Entering %s's chat", streamer_name);
          enterChat({
            streamer_name,
            access_token: data.token,
            user_id: data.userId,
          }).then((leaveFn) => {
            leaveChat = leaveFn;
          });
        },
        exit: function () {
          // TODO: allow to abort entering a chat?
          if (leaveChat) {
            console.log("Leaving %s's chat", chat_name);
            leaveChat();
          } else {
            console.error("Not in a chat, or still entering one");
          }
        },
      };
    }
  }
}

main();
