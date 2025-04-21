import {
  getEmotesetFrom7tv,
  ImageHostFile,
} from "./lib/integrations/seventv/api";
import {
  getAccessToken,
  getChatBadges,
  getCheermotes,
  getGlobalBadges,
  getUserData,
} from "./lib/integrations/twitch/api";
import {
  Cheermote,
  CheermoteTier,
} from "./lib/integrations/twitch/twitchCheermotes";
import { setupChat } from "./lib/renders/chat-render";

import { setup } from "./main";

import "./style.css";

declare global {
  interface Console {
    chat: ReturnType<typeof setupChat>;
  }
  interface Window {
    Twitch: {
      login: () => void;
      logout: () => void;
      Chat: Chat;
    };
    Chat: Chat;
  }
  interface Chat {
    enter: (streamer: string) => void;
    exit: () => void;
  }
}

export type CheermoteTiersMap = Map<
  CheermoteTier["id"],
  [CheermoteTier["color"], string]
>;

const devMode = false;

function size2x(element: ImageHostFile) {
  return element.name === "2x";
}

// TODO: Use cookies instead of storage
async function login() {
  console.log("Logging in...");

  const app = document.querySelector("#app");
  if (!app) return; // TODO Maybe don't require app

  const access_token = await getAccessToken(app);
  if (!access_token) return;

  // Use a component for this maybe, adding both login and logout?
  const logout = document.createElement("a");
  logout.href = "#";
  logout.addEventListener("click", () => window.Twitch?.logout());
  logout.innerText = "Log out";
  app.appendChild(logout);

  const { token, userId } = access_token;
  if (!(token && userId)) {
    console.error("An error occured, try reloading");
    return;
  }

  // TODO: Don't store it, simply request it again
  localStorage.setItem("access_token", token);
  // THis one is fine
  localStorage.setItem("user_id", userId);

  console.log("Logged in");

  return access_token;
}

// TODO: Use cookies instead of storage
async function logout() {
  console.log("Logging out...");

  localStorage.removeItem("access_token");
  localStorage.removeItem("user_id");

  console.log("Logged out");

  location.reload();
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

  // TODO: Type this so TS doesn't complain further down
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emoteSetTransformed: any = Object.fromEntries(
    Array.from(emojis.values(), function (v) {
      const file = v.files.find(size2x) ?? v.files[0];
      return [
        v.alias,
        {
          type: "emote",
          alias: v.alias,
          image: { url: `https:${v.url}/${file.name}` },
        },
      ];
    })
  );

  const badgesMap = new Map<string, Map<string, [string, string]>>();

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
  const cheermotesMap = new Map<Cheermote["prefix"], CheermoteTiersMap>();

  const cheermotes = await getCheermotes(
    access_token,
    client_id,
    broadcaster_id
  );
  if (cheermotes) {
    for (let i = 0; i < cheermotes.length; i++) {
      const cheermote = cheermotes[i];

      const cheermoteTiers: CheermoteTiersMap = new Map();
      for (let j = 0; j < cheermote.tiers.length; j++) {
        const tier = cheermote.tiers[j];
        cheermoteTiers.set(tier.id, [tier.color, tier.images.dark.animated[1]]);
      }

      cheermotesMap.set(cheermote.prefix.toLowerCase(), cheermoteTiers);
    }
  }

  const chat = setupChat(emoteSetTransformed, badgesMap, cheermotesMap);

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

  // TODO: Make types
  //@ts-expect-error(Type not rolled yet)
  eventBus.addEventListener("message", ({ detail }) => {
    const fragments = [];
    for (const fragment of detail.message.fragments) {
      const { text, type } = fragment;
      if (type === "text") {
        fragments.push(text);
      } else if (type === "emote") {
        const emote = fragment.emote;
        const part = {
          type,
          alias: text,
          image: {
            url: `https://static-cdn.jtvnw.net/emoticons/v2/${emote.id}/default/dark`,
          },
        };
        fragments.push(part);
      } else if (type === "cheermote") {
        const part = {
          type,
          alias: text,
          cheermote: fragment.cheermote,
        };
        fragments.push(part);
      }
    }

    const obj = {
      from: {
        name: detail.chatter_user_name,
        color: detail.color,
        badges: detail.badges,
      },
      time: detail.timestamp,
      message: fragments,
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
    window.Twitch = {
      login: () => {
        const loginBtn: HTMLElement | null = document.querySelector("#login");
        if (loginBtn) {
          console.error(
            "Couldn't find the login button. Try manually clicking it in the HTML"
          );
        }
        loginBtn?.click();
      },
      logout,
      Chat: window.Chat ?? {
        enter: () => {
          console.error("You can't use the chat until you log in");
        },
        exit: () => {
          console.error("You can't use the chat until you log in");
        },
      },
    };

    console.log(
      "How to use this chat: " +
        "\n1. Login with twitch by clicking on the html link 'login'. Alternatively, you can call Twitch.login(). If already logged in, your session will be used" +
        "\n2. Connect to a chatroom by calling Chat.enter(streamer) or Twitch.Chat.enter(streamer). If already in a chat, you will leave that and enter this new one." +
        "\n3. To leave to a chatroom, you can call Chat.leave() or Twitch.Chat.leave()" +
        "\n4. To logout, you can click on 'logout' in the page or call Twitch.logout()"
    );

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

      window.Twitch.Chat = window.Chat;
    }
  }
}

main();
