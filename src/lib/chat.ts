declare global {
  interface Window {
    chrome?: unknown;
  }
}

export interface EmoteData {
  alias: string;
  image: {
    url: string;
  };
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
  config: Config = DEFAULT_CONFIG
) {
  type emoteKey = keyof EmoteMap & string;

  type EmojiType = {
    name: string;
    ratio: number;
    str: string;
  };

  const SIZE = config.sizes.emote;
  const SIZE_SPACE = config.sizes.space;

  const browser = config.forceBrowser || detectedBrowser;
  if (!browser || !allowedBrowsers.includes(browser)) {
    console.error(
      "Not supported browser for emotes. If you are positive they will work, use forceBrowser in the config"
    );
  }

  const cachedEmotes: Partial<Record<emoteKey, EmojiType>> = {};

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
    } = await getEmojiData(emoji.image.url);
    const url = objectUrl;

    const sizeStr =
      browser === "chromium"
        ? `line-height: ${height}px; padding-left: ${width - SIZE_SPACE}px; `
        : `display: inline-flex; height: ${height}px; width: ${width + 10}px; `;

    const str = `color:transparent; ${sizeStr}; background: url('${url}'); background-size: ${width}px; background-repeat: no-repeat;`;

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

  // TODO: Since is async, use a queue instead
  return async function chat({
    message,
    from,
  }: {
    message: string;
    from?: { name: string; color?: string };
  }) {
    // if (typeof input !== "string" || input.trim().length === 0) {
    //   console.log(input);
    //   return;
    // }

    const format = [];
    const msgs: (string[] | Pick<EmojiType, "ratio" | "name">)[] = [];

    if (from) {
      format.push("%c%s%c%s");
      const colorStyle = from.color ? `color: ${from.color}` : "";
      msgs.push([colorStyle], [from.name], [""], [":"]);
    }

    for (const word of message.split(" ")) {
      let emoji = null;
      if (word in emoteMap) {
        emoji = await getEmoji(word);
      }

      if (emoji) {
        format.push("%c%s");
        msgs.push([emoji.str], { ratio: emoji.ratio, name: emoji.name });
      } else {
        let last = msgs.pop();
        if (!last || !Array.isArray(last)) {
          if (last && !Array.isArray(last)) msgs.push(last);

          format.push("%c%s");
          msgs.push([""]);
          last = [];
        }

        last.push(word || "");
        msgs.push(last);
      }
    }

    const finalArr = msgs.map(
      (x) => (Array.isArray(x) ? x.join(" ") : " ")
      // : new Array(Math.ceil((SIZE * x.ratio) / SIZE_SPACE) + 1).join(" ")
    );

    console.log(format.join(" "), ...finalArr);
  };
}

// TODO: Control exceptions
export async function get7tvMap() {
  const response = await fetch(
    "https://juners.github.io/emote-usage/emotes.json"
  );
  const emotes = response.json();

  return emotes;
}

type EmojiInfo = {
  width: number;
  height: number;
  base64: string;
};

// TODO: Optimize it so after unused for a while, is removed
const emojiCache: {
  [key: string]: EmojiInfo;
} = {};

// TODO: Control exceptions
export async function getEmojiData(url: string): Promise<EmojiInfo> {
  if (emojiCache[url]) return emojiCache[url];

  const blob = await (await fetch(url)).blob();

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
  emojiCache[url] = emoji;

  return emoji;
}
