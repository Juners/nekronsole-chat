/**
 * This file was generated with GitHub Copilot on 20/04/2025.
 *
 * Manually adjusted on 21/04/2025.
 */

/** https://dev.twitch.tv/docs/api/reference/#get-channel-chat-badges */
export interface BroadcasterChatBadgesRequest {
  /**
   * The ID of the broadcaster whose chat badges you want to get.
   */
  broadcaster_id: string;
}

/** */
export interface BadgeVersion {
  /**
   * An ID that identifies this version of the badge.
   * For example, for Bits, the ID is the Bits tier level, but for World of Warcraft, it could be Alliance or Horde.
   */
  id: string;

  /**
   * A URL to the small version (18px x 18px) of the badge.
   */
  image_url_1x: string;

  /**
   * A URL to the medium version (36px x 36px) of the badge.
   */
  image_url_2x: string;

  /**
   * A URL to the large version (72px x 72px) of the badge.
   */
  image_url_4x: string;

  /**
   * The title of the badge.
   */
  title: string;

  /**
   * The description of the badge.
   */
  description: string;

  /**
   * The action to take when clicking on the badge.
   * Set to `null` if no action is specified.
   */
  click_action: string | null;

  /**
   * The URL to navigate to when clicking on the badge.
   * Set to `null` if no URL is specified.
   */
  click_url: string | null;
}

export interface BadgeSet {
  /**
   * An ID that identifies this set of chat badges.
   * For example, Bits or Subscriber.
   */
  set_id: string;

  /**
   * The list of chat badges in this set.
   */
  versions: BadgeVersion[];
}

export interface BroadcasterChatBadgesResponse {
  /**
   * The list of chat badges.
   * The list is sorted in ascending order by `set_id`, and within a set, the list is sorted in ascending order by `id`.
   */
  data: BadgeSet[];
}

export enum ResponseCode {
  /**
   * Successfully retrieved the broadcaster’s custom chat badges.
   */
  OK = 200,
  /**
   * The *broadcaster_id* query parameter is required.
   */
  Bad_Request = 400,
  /**
   * * The Authorization header is required and must specify a valid app access token or user access token.
   * * The OAuth token is not valid.
   * * The ID in the Client-Id header must match the Client ID in the OAuth token.
   */
  Unauthorized = 401,
}
