import { get7tvMap, setupChat } from "./lib/renders/chat-render";

import { setup } from "./main";

import "./style.css";

declare global {
  interface Console {
    chat: ReturnType<typeof setupChat>;
  }
}

async function main(devMode = false) {
  function getSSOLink(forceVerify = false) {
    const state = crypto.randomUUID();
    localStorage.setItem("state", state);

    const claims: OIDCClaimsRequest = {
      //   id_token: {
      //     picture: null,
      //     preferred_username: null,
      //   },
      userinfo: {
        // TODO: In theory this should be returned, but is not being done
        picture: null,
        preferred_username: null,
      },
    };

    const link = document.createElement("a");
    const url = new URL("https://id.twitch.tv/oauth2/authorize");
    const params = {
      claims: JSON.stringify(claims),
      client_id: import.meta.env.VITE_CLIENT_ID,
      redirect_uri: import.meta.env.VITE_REDIRECT_URI,
      response_type: "token",
      // response_type: "token id_token",
      scope: "user:read:chat",
      // TODO: add nonce param using id_token
      state,
      force_verify: false,
    };
    if (forceVerify) {
      params["force_verify"] = true;
    }
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, value);
    }
    link.href = url.toString();
    link.append(document.createTextNode("Connect with Twitch"));

    return link;
  }

  /** Returns the userId if valid, null otherwise */
  async function validateToken(access_token: string) {
    try {
      const response = await fetch("https://id.twitch.tv/oauth2/userinfo", {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
      });
      const claims: OIDCDefaultClaims = await response.json();

      if (claims.iss !== "https://id.twitch.tv/oauth2") {
        console.error("Token not valid, the issuer doesn't match");
        return null;
      }
      if (claims.aud !== import.meta.env.VITE_CLIENT_ID) {
        console.error("Token not valid, the client ID doesn't match");
        return null;
      }

      // TODO: Validate signing algorithm by calling the discovery endpoint: https://dev.twitch.tv/docs/authentication/getting-tokens-oidc/#discovering-supported-claims-and-authorization-URIs
      // TODO: Validate public JWK by calling the discovery endpoint: https://dev.twitch.tv/docs/authentication/getting-tokens-oidc/#discovering-supported-claims-and-authorization-URIs

      if (!claims.sub) {
        console.error("Token not valid, the user ID wasn't found");
        return null;
      }

      return claims.sub;
    } catch (e) {
      console.error("An error occured while validating the claims", e);
      return null;
    }
  }

  async function getAccessToken() {
    const access_token = localStorage.getItem("access_token");
    const user_id = localStorage.getItem("user_id");

    if (access_token && user_id) {
      return { token: access_token, userId: user_id };
    }

    const { searchParams, hash } = new URL(location.href);
    if (hash) {
      const sentState = localStorage.getItem("state");
      if (sentState) {
        const data = new URLSearchParams(hash.substring(1));
        const state = data.get("state");
        if (state !== sentState) {
          console.error("State doesn't match, aborting");
          return null;
        }

        const token = data.get("access_token");
        if (!token) {
          console.error("No token found in the SSO response");
          return null;
        }

        const userId = await validateToken(token);
        if (userId) {
          return { token, userId };
        }
      }
    } else {
      app?.append(getSSOLink(true));

      if (searchParams.has("error")) {
        console.error(
          `The SSO returned an error! Was it canceled? Error ${searchParams.get(
            "error"
          )}: ${searchParams.get("error_description")}`
        );

        return null;
      }
    }

    return null;
  }

  const app = document.querySelector("#app");

  const access_token = await getAccessToken();

  if (access_token) {
    const { token, userId } = access_token;
    if (token && userId) {
      localStorage.setItem("access_token", token);
      localStorage.setItem("user_id", userId);

      const { start, eventBus } = setup(token, userId, devMode);

      eventBus.addEventListener("connected", () => {
        console.log("Connected to the chatroom");
      });

      eventBus.addEventListener("message", ({ detail }) => {
        // console.log(detail);
        // TODO: Do a bit of parsing
        const msg = detail.message.fragments
          .filter(({ type }) => type === "text")
          .map(({ text }) => text)
          .join("");

        const obj = {
          from: {
            name: detail.chatter_user_name,
            color: detail.color,
          },
          message: msg,
        };

        console.chat(obj);
      });

      eventBus.addEventListener("disconnected", () => {
        console.log("Left the chatroom");
      });

      start();
    } else {
      console.error("An error occured, try reloading");
    }
  }
}

if ("chat" in globalThis.console) {
  console.warn("chat is already in use");
} else {
  const emojis = await get7tvMap();

  const animatedWebp = ({ mime, scale, frameCount }) =>
    mime === "image/webp" && scale === 1 && frameCount > 1;
  const staticWebp = ({ mime, scale, frameCount }) =>
    mime === "image/webp" && scale === 1;

  const map = Object.entries(emojis)
    .map(([alias, em]) => {
      const imageList = em.images?.emote?.images;
      if (!imageList?.length) {
        return;
      }

      const image =
        imageList.find(animatedWebp) ||
        imageList.find(staticWebp) ||
        imageList[0];

      return [alias, { alias: em.alias, image }];
    })
    .filter((x) => !!x);

  const chat = setupChat(Object.fromEntries(map));

  console.chat = chat;
}

main();
