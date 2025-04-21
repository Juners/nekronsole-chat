import {
  BroadcasterChatBadgesRequest,
  BroadcasterChatBadgesResponse,
} from "./twitchBroadcasterChatBadges";
import { GlobalChatBadgesResponse } from "./twitchChatBadges";
import {
  GetCheermotesRequest,
  GetCheermotesResponse,
} from "./twitchCheermotes";

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
  link.id = "login";
  link.href = url.toString();
  link.append(document.createTextNode("Connect with Twitch"));
  link.target = "authorizeWithTwitch";

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

function loginNewTab(
  ev: MouseEvent,
  url: string,
  handlerRef: { current: Window | undefined }
) {
  const width = 700;
  const height = 800;
  const marginLeft = window.screenLeft + (window.outerWidth - width) / 2;
  const marginTop = window.screenTop + (window.outerHeight - height) / 2;
  let handle = window.open(
    "./login.html?" + new URLSearchParams([["url", url]]),
    "authorizeWithTwitch",
    `width=${width}px,height=${height}px,left=${marginLeft}px,top=${marginTop}px,popup=true`
  );

  // Try to open it in a new tab instead
  if (!handle) {
    handle = window.open(url, "login");
  }

  // If still not allowed, we redirect
  if (!handle) {
    return;
  }

  handlerRef.current = handle;

  ev.preventDefault();
}

export async function getAccessToken(app: Element) {
  const access_token = localStorage.getItem("access_token");
  const user_id = localStorage.getItem("user_id");

  if (access_token && user_id) {
    return { token: access_token, userId: user_id };
  }

  const link = getSSOLink(true);

  const handlerRef: { current: Window | undefined } = { current: undefined };
  const promise = new Promise<{ token: string; userId: string }>((res, rej) => {
    link.addEventListener("click", (ev) =>
      loginNewTab(ev, link.href, handlerRef)
    );

    window.addEventListener("message", async (e) => {
      if (
        e.origin !== import.meta.env.VITE_URL ||
        e.data?.type !== "authorize_twitch"
      )
        return;
      if (!e.data.data?.link) return;

      const { searchParams, hash } = new URL(e.data.data?.link);
      const sentState = localStorage.getItem("state");
      if (sentState) {
        const data = new URLSearchParams(hash.substring(1));
        const state = data.get("state");
        if (state !== sentState) {
          rej("State doesn't match, aborting");
        }

        const token = data.get("access_token");
        if (!token) {
          rej("No token found in the SSO response");
        }

        if (token) {
          validateToken(token)
            .then((userId) => {
              if (userId) {
                res({ token, userId });
              }
            })
            .catch((err) => rej(err));
        } else {
          if (searchParams.has("error")) {
            rej(
              `The SSO returned an error! Was it canceled? Error ${searchParams.get(
                "error"
              )}: ${searchParams.get("error_description")}`
            );
          }
        }
      } else {
        rej("An error occured while validating, try reloading");
      }
    });
  });

  app.append(link);

  const data = await promise;
  handlerRef.current?.close();
  app.removeChild(link);

  return data;
}

export async function getGlobalBadges(access_token: string, client_id: string) {
  try {
    const response = await fetch(
      "https://api.twitch.tv/helix/chat/badges/global",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Client-Id": client_id,
          "Content-Type": "application/json",
        },
      }
    );
    const globalBadges: GlobalChatBadgesResponse = await response.json();

    return globalBadges.data;
  } catch (e) {
    console.error("An error occured while retrieving the global badges", e);
    return null;
  }
}

export async function getChatBadges(
  broadcaster_id: string,
  access_token: string,
  client_id: string
) {
  try {
    const request: BroadcasterChatBadgesRequest = {
      broadcaster_id,
    };

    const params = new URLSearchParams(Object.entries(request));
    const response = await fetch(
      `https://api.twitch.tv/helix/chat/badges?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Client-Id": client_id,
          "Content-Type": "application/json",
        },
      }
    );
    const badges: BroadcasterChatBadgesResponse = await response.json();

    return badges.data;
  } catch (e) {
    console.error("An error occured while retrieving the channel badges", e);
    return null;
  }
}

export async function getUserData(
  user_login: string,
  access_token: string,
  client_id: string
) {
  try {
    const request = {
      login: user_login,
    };

    const params = new URLSearchParams(Object.entries(request));
    const response = await fetch(
      `https://api.twitch.tv/helix/users?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Client-Id": client_id,
          "Content-Type": "application/json",
        },
      }
    );
    const users = await response.json();

    return users.data;
  } catch (e) {
    console.error("An error occured while getting the user data", e);
    return null;
  }
}

export async function getChannelData(
  broadcaster_id: string,
  access_token: string,
  client_id: string
) {
  try {
    const request = {
      broadcaster_id,
    };

    const params = new URLSearchParams(Object.entries(request));
    const response = await fetch(
      `https://api.twitch.tv/helix/channels?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Client-Id": client_id,
          "Content-Type": "application/json",
        },
      }
    );
    const channels = await response.json();

    return channels.data[0];
  } catch (e) {
    console.error("An error occured while getting the channel data", e);
    return null;
  }
}

export async function getCheermotes(
  access_token: string,
  client_id: string,
  broadcaster_id?: string
) {
  try {
    const request: GetCheermotesRequest = broadcaster_id
      ? {
          broadcaster_id,
        }
      : {};

    const params = new URLSearchParams(Object.entries(request));
    const response = await fetch(
      `https://api.twitch.tv/helix/bits/cheermotes?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Client-Id": client_id,
          "Content-Type": "application/json",
        },
      }
    );
    const cheermotes: GetCheermotesResponse = await response.json();

    return cheermotes.data;
  } catch (e) {
    console.error("An error occured while getting the cheermotes data", e);
    return null;
  }
}

export async function isChannelLive(
  broadcaster_id: string,
  access_token: string,
  client_id: string
) {
  try {
    const request = {
      broadcaster_id,
    };

    const params = new URLSearchParams(Object.entries(request));
    const response = await fetch(
      `https://api.twitch.tv/helix/channels?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Client-Id": client_id,
          "Content-Type": "application/json",
        },
      }
    );
    const channels = await response.json();

    return channels.data[0];
  } catch (e) {
    console.error("An error occured while getting the channel data", e);
    return null;
  }
}
