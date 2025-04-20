import {
  EmoteVersionState,
  ImageHostFile,
  UserConnectionModel,
} from "./seventv.d";

export type EmoteData = {
  alias: string;
  files: ImageHostFile[];
  state: EmoteVersionState[];
  url: string;
};

async function getUserFromTwitch(userId: string) {
  try {
    const response = await fetch(
      `https://api.7tv.app/v3/users/twitch/${userId}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const status = response.status;
    if (response.status !== 200) {
      throw new Error(
        `An error occured while loading the 7tv user ${status}: ${response.statusText}.`
      );
    }

    const user7tv: UserConnectionModel = await response.json();

    return user7tv;
  } catch (e) {
    console.error("An error occured while trying to get the user from 7tv", e);
  }
}

function webp({ format }: ImageHostFile) {
  return format === "WEBP";
}
function png({ format }: ImageHostFile) {
  return format === "PNG";
}

export async function getEmotesetFrom7tv(ownerId: string) {
  const user = await getUserFromTwitch(ownerId);

  const emoteSet = new Map<string, EmoteData>();
  if (user?.emote_set?.emotes) {
    const emotes = user.emote_set.emotes;
    for (let i = 0; i < emotes.length; i++) {
      const element = emotes[i];
      if (!element.data?.host) continue;

      const { files, url } = element.data.host;
      const webpFiles = files.filter(webp);
      emoteSet.set(element.id, {
        alias: element.name,
        files: webpFiles.length ? webpFiles : files.filter(png),
        state: element.data.state,
        url,
      });
    }
  }

  return emoteSet;
}
