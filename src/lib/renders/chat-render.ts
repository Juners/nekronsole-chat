import { CheermoteTiersMap } from "@/index";

declare global {
  interface Window {
    chrome?: unknown;
  }
}

const isLocalhost = location.hostname === "localhost";

export interface EmoteData {
  type: "emote";
  alias: string;
  image: {
    url: string;
  };
}

export interface CheermoteData {
  type: "cheermote";
  alias: string;
  cheermote: { prefix: string; bits: number; tier: number };
}

export interface Config {
  sizes: {
    space: number;
    emote: number;
  };
  forceBrowser?: BROWSERS;
}

type BROWSERS = "chromium" | "firefox";
const allowedBrowsers: BROWSERS[] = ["chromium", "firefox"];

let detectedBrowser: BROWSERS | undefined;
if (window.chrome || /chrome/i.test(window.navigator.userAgent)) {
  detectedBrowser = "chromium";
} else if (/firefox/i.test(window.navigator.userAgent)) {
  detectedBrowser = "firefox";
}

export const DEFAULT_CONFIG: Config = {
  sizes: {
    emote: 21,
    space: 6.5,
  },
};

export function setupChat<EmoteMap extends { [key: string]: EmoteData }>(
  emoteMap: EmoteMap,
  badgeMap: Map<string, Map<string, [string, string]>>,
  cheermotesMap: Map<string, CheermoteTiersMap>,
  config: Config = DEFAULT_CONFIG
) {
  type emoteKey = keyof EmoteMap & string;

  type EmojiType = {
    name: string;
    ratio: number;
    str: string;
    color?: string;
    extraText?: string;
  };

  // const SIZE = config.sizes.emote;
  // const SIZE_SPACE = config.sizes.space;
  // const BASE_CSS = "line-height: 32px;";
  const BASE_CSS = "";

  const browser = config.forceBrowser || detectedBrowser;
  if (!browser || !allowedBrowsers.includes(browser)) {
    console.error(
      "Not supported browser for emotes. If you are positive they will work, use forceBrowser in the config"
    );
  }

  const cachedEmotes: Partial<Record<emoteKey, EmojiType>> = {};
  const cachedBadges = new Map<string, EmojiType>();
  const cachedTwitchEmotes = new Map<string, EmojiType>();
  const cachedCheermotes = new Map<string, EmojiType>();

  // let biggestHeight = SIZE;

  async function getEmoji(em: emoteKey): Promise<EmojiType> {
    let cached = cachedEmotes[em];
    if (cached) {
      return cached;
    }

    const emoji = emoteMap[em];
    const {
      width,
      height,
      base64: objectUrl,
    } = await getImage(emoji.image.url);
    const url = objectUrl;

    const sizeStr =
      browser === "chromium"
        ? `padding-top: ${height / 2 + height / 4}px; padding-bottom: ${
            height / 2
          }px; padding-left: ${width}px; `
        : `display: inline-flex; height: ${height}px; width: ${width + 10}px; `;

    // TODO: Prohibit more than 32 px high emojis, or do something different here? Maybe check all sizes provided and pick the biggest?
    const str = `color:transparent; font-size: 0px; ${sizeStr}; background: url('${url}'); background-size: ${width}px; background-repeat: no-repeat;`;

    // if (height > biggestHeight) biggestHeight = height;

    cached = {
      name: em,
      // ratio: ("ratio" in emoji ? ratio ?? 1 : 1) * modifier,
      ratio: 1,
      str,
    };

    cachedEmotes[em] = cached;

    return cached;
  }

  async function getBadge(
    kind: string,
    version: string
  ): Promise<EmojiType | undefined> {
    let cached = cachedBadges.get(kind);
    if (cached) {
      return cached;
    }

    const badge = badgeMap.get(kind);
    const badgeVersion = badge?.get(version);
    if (!badgeVersion) return;

    const {
      width,
      height,
      base64: objectUrl,
    } = await getImage(badgeVersion[1]);
    const url = objectUrl;

    const sizeStr =
      browser === "chromium"
        ? `padding-top: ${height * 0.75}px; padding-bottom: ${
            height / 2
          }px; padding-left: ${width + 2}px; `
        : `display: inline-flex; height: ${height}px; width: ${width + 10}px; `;

    const str = `color:transparent; font-size: 0px; ${sizeStr}; background: url('${url}'); background-size: ${width}px; background-repeat: no-repeat;`;

    cached = {
      name: badgeVersion[0],
      ratio: 1,
      str,
    };

    cachedBadges.set(kind, cached);

    return cached;
  }

  async function getTwitchEmote({
    alias,
    image,
  }: EmoteData): Promise<EmojiType | undefined> {
    let cached = cachedTwitchEmotes.get(alias);
    if (cached) {
      return cached;
    }

    const {
      width,
      height,
      base64: objectUrl,
    } = await getImage(image.url + "/1.0");
    const url = objectUrl;

    const sizeStr =
      browser === "chromium"
        ? `padding-top: ${height / 2 + height / 4}px; padding-bottom: ${
            height / 2
          }px; padding-left: ${width}px; `
        : `display: inline-flex; height: ${height}px; width: ${width + 10}px; `;

    const str = `color:transparent; font-size: 0px; ${sizeStr}; background: url('${url}'); background-size: ${width}px; background-repeat: no-repeat;`;

    cached = {
      name: alias,
      ratio: 1,
      str,
    };

    cachedTwitchEmotes.set(alias, cached);

    return cached;
  }

  async function getCheermote({
    alias,
    cheermote,
  }: CheermoteData): Promise<EmojiType | undefined> {
    const prefix = cheermote.prefix.toLowerCase(); // .toLowerCase() since I don't trust twitch API anymore after cheermotes
    const key = prefix + cheermote.tier; // The alias here is too dynamic to use as the cache key, so we use the prefix plus tier instead
    let cached = cachedCheermotes.get(key);
    if (cached) {
      return cached;
    }

    const image = cheermotesMap.get(prefix)?.get(cheermote.tier.toString());

    if (!image) return;

    const {
      width,
      height,
      base64: objectUrl,
    } = await getImage(image[1]);
    const url = objectUrl;

    const sizeStr =
      browser === "chromium"
        ? `padding-top: ${height / 2 + height / 4}px; padding-bottom: ${
            height / 2
          }px; padding-left: ${width}px; `
        : `display: inline-flex; height: ${height}px; width: ${width + 10}px; `;

    const str = `color:transparent; font-size: 0px; ${sizeStr}; background: url('${url}'); background-size: ${width}px; background-repeat: no-repeat;`;

    cached = {
      name: alias,
      ratio: 1,
      str,
      extraText: cheermote.bits.toString(),
    };

    cachedCheermotes.set(key, cached);

    return cached;
  }

  // TODO: Since is async, use a queue instead
  return async function chat({
    message,
    from,
    time,
  }: {
    message: (string | EmoteData | CheermoteData)[];
    from?: {
      name: string;
      color?: string;
      badges?: { id: string; info: string; set_id: string }[];
    };
    time?: number;
  }) {
    // if (typeof input !== "string" || input.trim().length === 0) {
    //   console.log(input);
    //   return;
    // }

    const format = [];
    const msgs: (string | string[] | Pick<EmojiType, "name">)[] = [];

    if (time) {
      format.push("%c%s%c");
      const colorStyle = "color: rgb(167 167 167); padding-right: 1px;";
      const timeStr = new Date(time).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });
      msgs.push(BASE_CSS + colorStyle, [`[${timeStr}]`], BASE_CSS);
    }

    if (from && from.name) {
      for (const { set_id, id } of from.badges || []) {
        const badge = await getBadge(set_id, id);
        if (badge) {
          format.push("%c%s");
          msgs.push(badge.str, { name: badge.name });
        }
      }

      format.push("%c%s%c%s");
      const colorStyle = from.color ? `color: ${from.color};` : "";
      msgs.push(BASE_CSS + colorStyle, [from.name], BASE_CSS, [":"]);
    }

    async function addToMessage(
      toRender: string | EmojiType,
      forceNew = false
    ) {
      if (typeof toRender !== "string") {
        let formatStr = "%c%s";
        if (toRender.extraText) {
          formatStr += "%c%s";
        }
        format.push(formatStr);
        msgs.push(toRender.str, { name: toRender.name });
        if (toRender.extraText) {
          msgs.push(toRender.color ? `color: ${toRender.color};` : BASE_CSS, [
            toRender.extraText,
          ]);
        }
      } else {
        let last = msgs.pop();
        if (!Array.isArray(last)) {
          if (last) msgs.push(last);

          format.push("%c%s");
          msgs.push(BASE_CSS);
          last = [];
        }

        last.push(toRender || "");
        msgs.push(last);

        // TODO: Do this cleaner by using tokens instead of this weird ass arrays
        if (forceNew) {
          format.push("%c%s");
          msgs.push(BASE_CSS, []);
        }
      }
    }

    async function extractEmoteFromWord(word: string) {
      let emoji;
      if (word && word in emoteMap) {
        emoji = await getEmoji(word);
      }

      return emoji;
    }

    for (const fragment of message) {
      if (typeof fragment === "string") {
        const words = fragment.split(" ");
        for (let i = 0; i < words.length; i++) {
          const word = words[i];
          const emoji = await extractEmoteFromWord(word);
          await addToMessage(emoji ?? word);
        }
      } else {
        let emoji;
        if (fragment.type === "emote") {
          emoji = await getTwitchEmote(fragment);
        } else if (fragment.type === "cheermote" && !isLocalhost) {
          // Bullshit cashgrab cheers don't work on localhost because of AWS CDN blocking it
          emoji = await getCheermote(fragment);
        }

        if (!emoji) {
          emoji = await extractEmoteFromWord(fragment.alias);
        }

        await addToMessage(emoji ?? fragment.alias, !emoji);
      }
    }

    // TODO: Trailing strings are being parsed out
    const finalArr = msgs.map((x) => {
      let str;
      if (typeof x === "string") {
        str = x;
      } else if (Array.isArray(x)) {
        str = x.join(" ");
      } else {
        str = x.name;
      }
      return str;
    });

    console.log(format.join(""), ...finalArr);
  };
}

type ImageInfo = {
  width: number;
  height: number;
  base64: string;
};

// TODO: Optimize it so after unused for a while, is removed
const imageCache: {
  [key: string]: ImageInfo;
} = {};

// TODO: Control exceptions
export async function getImage(url: string): Promise<ImageInfo> {
  if (imageCache[url]) return imageCache[url];

  const blob = await (await fetch(url)).blob();

  // TODO: should i remove the object url, or will it stop rendering them?
  const src = URL.createObjectURL(blob);
  const img = document.createElement("img");
  img.src = src;

  // TODO: Use Resolve.all instead, to allow more parallelism?

  const base64 = await new Promise<string>((res) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = function () {
      const base64data = reader.result;
      if (typeof base64data === "string") {
        res(base64data);
      }
      // TODO: If not string? What do?
    };
  });

  const { width, height } = await new Promise<{
    width: number;
    height: number;
  }>((res) => {
    img.onload = () => {
      const emoji = { width: img.width, height: img.height };
      res(emoji);
    };
  });
  const emoji = { width, height, base64 };
  imageCache[url] = emoji;

  return emoji;
}
