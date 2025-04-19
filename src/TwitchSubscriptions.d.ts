type SubscriptionTypes = "channel.chat.message";

interface SubscriptionRequest {
  type: SubscriptionTypes;
  version: string;
  condition: object;
  transport: object;
}

interface SubscriptionResponse {
  data: SubscriptionData[];
  /** The UTC date and time that the WebSocket connection was established. Included only if method is set to websocket. */
  connected_at: string;
  /** The amount that the subscription counts against your limit. {@link https://dev.twitch.tv/docs/eventsub/manage-subscriptions/#subscription-limits Learn More} */
  cost: number;
  /** The total number of subscriptions you’ve created. */
  total: number;
  /** The sum of all of your subscription costs. {@link https://dev.twitch.tv/docs/eventsub/manage-subscriptions/#subscription-limits Learn More} */
  total_cost: number;
  /** The maximum total cost that you’re allowed to incur for all subscriptions you create. */
  max_total_cost: number;
}

interface SubscriptionData {
  /** An ID that identifies the subscription. */
  id: string;
  /**
   * The subscription’s status. The subscriber receives events only for enabled subscriptions. Possible values are:
   * * enabled — The subscription is enabled.
   * * webhook_callback_verification_pending — The subscription is pending verification of the specified callback URL (see {@link https://dev.twitch.tv/docs/eventsub/handling-webhook-events/#responding-to-a-challenge-request Responding to a challenge request}).
   * */
  status: SubscriptionStatus;
  /** The subscription’s type. See {@link https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#subscription-types Subscription Types}. */
  type: SubscriptionTypes;
  /** The version number that identifies this definition of the subscription’s data. */
  version: string;
  /** The subscription’s parameter values. This is a string-encoded JSON object whose contents are determined by the subscription type. */
  condition: object;
  /** The date and time (in RFC3339 format) of when the subscription was created. */
  created_at: string;
  /** The transport details used to send the notifications. */
  transport: TransportResponse;
}

enum SubscriptionStatus {
  /** The subscription is enabled */
  "enabled",
  /** The subscription is pending verification of the specified callback URL (see {@link https://dev.twitch.tv/docs/eventsub/handling-webhook-events/#responding-to-a-challenge-request Responding to a challenge request}). */
  "webhook_callback_verification_pending",
}

/**
 * {@link https://dev.twitch.tv/docs/eventsub/eventsub-reference/#transport}
 */
interface TransportRequest {
  /**
   * The transport method. Possible values are:
   * * ~~webhook~~
   * * websocket
   */
  method: "websocket";
  /** An ID that identifies the WebSocket to send notifications to. When you connect to EventSub using WebSockets, the server returns the {@link WelcomeMessage.payload ID} in the {@link https://dev.twitch.tv/docs/eventsub/handling-websocket-events/#welcome-message Welcome message}. */
  session_id?: string;
}

/**
 * {@link https://dev.twitch.tv/docs/eventsub/eventsub-reference/#transport}
 */
interface TransportResponse {
  /** The UTC date and time that the WebSocket connection was established. */
  connected_at: string;
  /** The UTC date and time that the WebSocket connection was lost. */
  disconnected_at: string;
  /** An ID that identifies the WebSocket that notifications are sent to. Included only if method is set to websocket. */
  session_id: string;
}

/**
 * {@link https://dev.twitch.tv/docs/api/reference/#delete-eventsub-subscription}
 */
interface SubscriptionUnsubscribeRequest {
  /** The ID of the subscription to delete. */
  id: string;
}

/** Response Codes */
enum SubscriptionUnsubscribeResponseCodes {
  /* No Content: Successfully deleted the subscription. */
  204,
  /* Bad Request: The *id* query parameter is required. */
  400,
  /**
   * Unauthorized:
   * * The Authorization header is required and must specify an app access token.
   * * The access token is not valid.
   * * The ID in the Client-Id header must match the client ID in the access token.
   */
  401,
  /* The subscription was not found.*/
  404,
}

interface ChannelChatMessageEvent extends SubscriptionRequest {
  /** The subscription type name */
  type: "channel.chat.message";
  /** The subscription type version: 1. */
  version: "1";
  /** Subscription-specific parameters. */
  condition: {
    /** The User ID of the channel to receive chat message events for. */
    broadcaster_user_id: string;
    /** The User ID to read chat as. */
    user_id: string;
  };
  /** Transport-specific parameters. */
  transport: TransportRequest;
}
