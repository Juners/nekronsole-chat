/**
 * Types generated from the documentation on 19/04/2025
 * Reference: {@link https://dev.twitch.tv/docs/eventsub/websocket-reference/}
 */

/**
 * Generic Message interface
 */
interface Message {
  /** An object that identifies the message. */
  metadata: {
    /**
     * An ID that uniquely identifies the message.
     * Twitch sends messages at least once, but if Twitch is unsure of whether you received a notification, it’ll resend the message.
     * This means you may receive a notification twice. If Twitch resends the message, the message ID will be the same.
     */
    message_id: string;
    /** The type of message */
    message_type: string;
    /** The UTC date and time that the message was sent. */
    message_timestamp: string;
  };

  /** An empty object. */
  payload: {};
}

/**
 * {@link https://dev.twitch.tv/docs/eventsub/websocket-reference/#welcome-message}
 */
interface WelcomeMessage extends Message {
  /** An object that identifies the message. */
  metadata: {
    /** The type of message, which is set to session_welcome. */
    message_type: "session_welcome";
  } & Message["metadata"];

  /** An object that contains the message. */
  payload: {
    /** An ID that uniquely identifies this WebSocket connection.
     * Use this ID to set the session_id field in all {@link https://dev.twitch.tv/docs/eventsub/manage-subscriptions/#subscribing-to-events subscription requests.} */
    id: string;
    /** The connection’s status, which is set to connected. */
    status: "connected";
    /** The maximum number of seconds that you should expect silence before receiving a {@link KeepaliveMessage keepalive message}.
     * For a welcome message, this is the number of seconds that you have to {@link https://dev.twitch.tv/docs/eventsub/manage-subscriptions/#subscribing-to-events subscribe to an event} after receiving the welcome message.
     * If you don’t subscribe to an event within this window, the socket is disconnected. */
    keepalive_timeout_seconds: string;
    /** The URL to reconnect to if you get a Reconnect message. Is set to null. */
    reconnect_url: null;
    /** The UTC date and time that the connection was created. */
    connected_at: string;
  };
}

/**
 * {@link https://dev.twitch.tv/docs/eventsub/websocket-reference/#keepalive-message}
 */
interface KeepaliveMessage extends Message {
  /** An object that identifies the message. */
  metadata: {
    /** The type of message, which is set to session_keepalive. */
    message_type: "session_keepalive";
  } & Message["metadata"];
}

/**
 * NOT DEFINED YET
 * {@link https://dev.twitch.tv/docs/eventsub/websocket-reference/#ping-message}
 */
interface PingMessage {
  // TODO
}

/**
 * {@link https://dev.twitch.tv/docs/eventsub/websocket-reference/#notification-message}
 */
interface NotificationMessage extends Message {
  /** An object that identifies the message. */
  metadata: {
    /** The type of message, which is set to notification. */
    message_type: "notification";
    /** The type of event sent in the message. */
    subscription_type: string;
    /** The version number of the subscription type’s definition. This is the same value specified in the subscription request. */
    subscription_version: string;
  } & Message["metadata"];

  /** An object that contains the message. */
  payload: {
    /** An object that contains information about your subscription. */
    subscription: SubscriptionInfo;
  } & Message["payload"];
}

interface SubscriptionInfo {
  /** An ID that uniquely identifies this subscription. */
  id: string;
  /** The subscription’s status, which is set to enabled. */
  status: "connected";
  /** An ID that uniquely identifies this subscription. */
  id: string;
  /** The subscription’s status, which is set to enabled. */
  status: "enabled";
  /** The type of event sent in the message. See the {@link SubscriptionInfo.event event} field. */
  type: string;
  /** The version number of the subscription type’s definition. */
  version: string;
  /** The event’s cost. See {@link https://dev.twitch.tv/docs/eventsub/manage-subscriptions/#subscription-limits Subscription limits}. */
  cost: number;
  /** The conditions under which the event fires. For example, if you requested notifications when a broadcaster gets a new follower, this object contains the broadcaster’s ID. For information about the condition’s data, see the subscription type’s description in {@link https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/ Subscription Types}. */
  condition: object;
  /** An object that contains information about the transport used for notifications. */
  transport: {
    /** The transport method, which is set to websocket. */
    method: string;
    /** An ID that uniquely identifies the WebSocket connection. */
    session_id: string;
  };
  /** The UTC date and time that the subscription was created. */
  created_at: string;
  /** The event’s data. For information about the event’s data, see the subscription type’s description in {@link https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/ Subscription Types}. */
  event: object;
}

/**
 * {@link https://dev.twitch.tv/docs/eventsub/websocket-reference/#reconnect-message}
 */
interface ReconnectMessage extends Message {
  /** An object that identifies the message. */
  metadata: {
    /** The type of message, which is set to session_reconnect. */
    message_type: "session_reconnect";
  } & Message["metadata"];

  /** An object that contains the message. */
  payload: {
    /** An object that contains information about the connection. */
    session: {
      /** An ID that uniquely identifies this WebSocket connection. */
      id: string;
      /** The connection’s status, which is set to reconnecting. */
      status: "reconnecting";
      /** Is set to null. */
      keepalive_timeout_seconds: null;
      /** The URL to reconnect to. Use this URL as is; do not modify it. The connection automatically includes the subscriptions from the old connection. */
      reconnect_url: string;
      /** The UTC date and time that the connection was created. */
      connected_at: string;
    };
  };
}

/**
 * {@link https://dev.twitch.tv/docs/eventsub/websocket-reference/#revocation-message}
 */
interface RevocationMessage extends Message {
  /** An object that identifies the message. */
  metadata: {
    /** The type of message, which is set to revocation. */
    message_type: "revocation";
    /** The type of event sent in the message. */
    subscription_type: string;
    /** The version number of the subscription type’s definition. This is the same value specified in the subscription request. */
    subscription_version: string;
  } & Message["metadata"];

  /** An object that contains the message. */
  payload: {
    /** An object that contains information about your subscription. */
    subscription: {
      /** An ID that uniquely identifies this WebSocket connection. */
      id: string;
      /**
       * The subscription's status. The following are the possible values:
       * * authorization_revoked — The user in the condition object revoked the authorization that let you get events on their behalf.
       * * user_removed — The user in the condition object is no longer a Twitch user.
       * * version_removed — The subscribed to subscription type and version is no longer supported.
       */
      status: RevocationStatus;
      /** The type of event sent in the message. */
      type: string;
      /** The version number of the subscription type’s definition. */
      version: string;
      /** The event’s cost. See {@link https://dev.twitch.tv/docs/eventsub/manage-subscriptions/#subscription-limits Subscription limits}. */
      cost: number;
      /** The conditions under which the event fires. For example, if you requested notifications when a broadcaster gets a new follower, this object contains the broadcaster’s ID. For information about the condition’s data, see the subscription type’s description in {@link https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/ Subscription Types}. */
      condition: object;
      /** An object that contains information about the transport used for notifications. */
      transport: {
        /** The transport method, which is set to websocket. */
        method: "websocket";
        /** An ID that uniquely identifies the WebSocket connection. */
        session_id: string;
      };
      /** The UTC date and time that the subscription was created. */
      created_at: string;
    };
  };
}

/** The subscription's status. */
enum RevocationStatus {
  /** The user in the condition object revoked the authorization that let you get events on their behalf. */
  "authorization_revoked",
  /** The user in the condition object is no longer a Twitch user. */
  "user_removed",
  /** The subscribed to subscription type and version is no longer supported. */
  "version_removed",
}

/**
 * NOT DEFINED YET
 * {@link https://dev.twitch.tv/docs/eventsub/websocket-reference/#close-message}
 */
interface CloseMessage {
  // TODO
}
