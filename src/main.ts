export function setup(access_token: string, user_id: string, devMode = false) {
  if (!access_token) {
    console.error("You must provide an access token first!");
  }

  const consumedMessages = new Map<
    string,
    Message["metadata"]["message_type"]
  >();

  const element: Node = document.createElement("div");

  // TODO: Allow to update the token when it expires!

  function getMessage(data: string) {
    try {
      const object: Partial<Message> = JSON.parse(data);
      const messsageType = object?.metadata?.message_type;
      const messageId = object?.metadata?.message_id;

      if (!messageId) {
        console.error("No ID in the message, ignoring it", object);
        return null;
      }

      if (messsageType) {
        // The twitch API can send the same message more than once. We protect against that and replay attacks that could duplicate messages
        if (consumedMessages.get(messageId)) {
          if (devMode) {
            console.warn("The message ID was not unique, ignoring it");
          }
        } else {
          consumedMessages.set(messageId, messsageType);
        }
      }

      switch (messsageType) {
        case "session_welcome":
          return object as WelcomeMessage;
        case "session_keepalive":
          return object as KeepaliveMessage;
        case "notification":
          return object as NotificationMessage;
        case "session_reconnect":
          return object as ReconnectMessage;
        case "revocation":
          return object as RevocationMessage;
        default:
          console.error("Unexpected message_type", object);
      }
    } catch (e) {
      console.error("An error occured trying to parse the message", e);
    }
  }

  async function subscribe(kind: SubscriptionRequest) {
    try {
      const response = await fetch(
        "https://api.twitch.tv/helix/eventsub/subscriptions",
        {
          method: "POST",
          body: JSON.stringify(kind),
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
            "Client-Id": import.meta.env.VITE_CLIENT_ID,
          },
        }
      );

      const status = response.status;
      if (response.status !== 202) {
        throw new Error(
          `An error occured while unsubscribing with status ${status}: ${response.statusText}.`
        );
      }

      const subscription: SubscriptionResponse = await response.json();
      if (devMode) {
        console.info(
          `Succesfully subscribed to ${subscription.data.length} events`
        );
      }

      element.dispatchEvent(new CustomEvent("connected"));

      return subscription;
    } catch (e) {
      console.error("An error occured while trying to subscribe", e);
    }
  }

  //@ts-expect-error(Not used yet)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function unsubscribe(eventId: string) {
    const request: SubscriptionUnsubscribeRequest = {
      id: eventId,
    };

    try {
      const response = await fetch(
        "https://api.twitch.tv/helix/eventsub/subscriptions",
        {
          method: "DELETE",
          body: JSON.stringify(request),
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
            "Client-Id": import.meta.env.VITE_CLIENT_ID,
          },
        }
      );
      const status = response.status;
      if (status === SubscriptionUnsubscribeResponseCodes[204]) {
        if (devMode) {
          console.info(`Succesfully unsubscribed the ID ${eventId}`);
        }

        element.dispatchEvent(new CustomEvent("disconnected"));
      } else {
        throw Error(
          `(${response.statusText}) An error occured while unsubscribing with status ${status}.`
        );
      }
    } catch (e) {
      console.error("An error occured while trying to subscribe", e);
    }
  }

  // TODO: Maybe have this cache protected by a closure?
  const subscriptions: Partial<Record<SubscriptionTypes, SubscriptionData>> =
    {};
  let maxAllowedCost = 0;
  let consumedCost = 0;

  //@ts-expect-error(Unusused for now)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function getSubscriptions(type?: SubscriptionTypes) {
    const request: GetSubscriptionsRequest = {
      user_id,
    };

    try {
      const params = new URLSearchParams(Object.entries(request));
      const response = await fetch(
        `https://api.twitch.tv/helix/eventsub/subscriptions?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
            "Client-Id": import.meta.env.VITE_CLIENT_ID,
          },
        }
      );
      const data = await response.json();
      if (response.status === 200) {
        // TODO: This could be paginated from backend
        // TODO: Create type
        return data.data.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (subscription: any) => subscription.type === type
        );
      } else {
        throw Error(
          `An error occured while reading the existing subscriptions with status ${response.status}: ${response.statusText}.`
        );
      }
    } catch (e) {
      console.error(
        "An error occured while trying to retrieve the existing subscriptions",
        e
      );
    }
  }

  let socket: WebSocket | null = null;
  function start(broadcaster_id: string) {
    async function onSessionWelcome(message: WelcomeMessage) {
      const session = message.payload.session.id;

      const newMessageSub: ChannelChatMessageEvent = {
        type: "channel.chat.message",
        version: "1",
        condition: {
          broadcaster_user_id: broadcaster_id,
          user_id,
        },
        transport: {
          method: "websocket",
          session_id: session,
        },
      };

      // TODO: Closing the socket closes the sub after it fails the pong. This is unnecesary on first conexion, so let's move it
      // let subscriptionData;
      // const existingSubs = await getSubscriptions("channel.chat.message");
      // if (existingSubs.length) {
      //   subscriptionData = existingSubs;
      // } else {
      // }
      const newSubscriptions = await subscribe(newMessageSub);

      if (newSubscriptions?.data?.length) {
        const data = newSubscriptions.data;
        maxAllowedCost = newSubscriptions.max_total_cost;
        consumedCost = newSubscriptions.total_cost;
        // TODO: Allow more than one? Close the old ones?
        subscriptions["channel.chat.message"] = data[0];
        // TODO: If the cost of the subscription goes over the limit, do something, idk, maybe warn the user
        if (consumedCost >= maxAllowedCost) {
          console.warn("Event subscription reached its limit!");
        }

        // TODO: if already a session welcome seen, ignore this?
      }
    }

    if (socket?.readyState !== WebSocket.OPEN) {
      socket = new WebSocket("wss://eventsub.wss.twitch.tv/ws");

      socket.onopen = function (e) {
        if (devMode) {
          console.info("Socket succesfully connected");
          console.info(e);
        }
      };

      socket.onmessage = async function (e) {
        const message = getMessage(e.data);

        if (devMode) {
          console.log(message);
          console.log(e.data);
        }

        if (!message) {
          if (devMode) {
            console.info("Skipping message", e);
          }
          return;
        }

        switch (message.metadata.message_type) {
          case "session_welcome":
            // TODO: Make TS not be bratty and accept this is an obvious discriminator, casting shouldn't be needed?
            onSessionWelcome(message as WelcomeMessage);
            break;
          case "notification":
            element.dispatchEvent(
              new CustomEvent("message", {
                detail: {
                  ...(message as NotificationMessage).payload.event,
                  timestamp: new Date(
                    message.metadata.message_timestamp
                  ).getTime(),
                },
              })
            );
            break;
          case "session_keepalive":
            // TODO: Do something here? Maybe if not recieved in a long time, reopen the connection? Seems to be each 10s.
            // Still alive
            break;
          default:
            console.warn(
              `Unexpected or unsupported message type ${message.metadata.message_type}`
            );
        }
      };

      socket.onclose = function (e) {
        if (devMode) {
          console.info("Socket closed");
          console.log(e);
        }
      };

      socket.onerror = function (e) {
        if (devMode) {
          console.info("An error occured when connecting to the socket");
          console.error(e);
        }
      };
    }
  }

  // TODO: Allow to reopen chat instead
  function stop() {
    socket?.close();
  }

  return {
    start,
    stop,
    eventBus: element,
  };
}
