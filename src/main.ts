function getMessage(data: string) {
  try {
    const object: Partial<Message> = JSON.parse(data);
    switch (object?.metadata?.message_type) {
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
      }
    );

    const status = response.status;
    if (response.status !== 202) {
      throw new Error(
        `(${response.statusText}) An error occured while unsubscribing with status ${status}.`
      );
    }

    const subscription: SubscriptionResponse = await response.json();
    console.info(
      `Succesfully subscribed to ${subscription.data.length} events`
    );

    return subscription;
  } catch (e) {
    console.error("An error occured while trying to subscribe", e);
  }
}

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
        },
      }
    );
    const status = response.status;
    if (status === SubscriptionUnsubscribeResponseCodes[204]) {
      console.info(`Succesfully unsubscribed the ID ${eventId}`);
    } else {
      throw Error(
        `(${response.statusText}) An error occured while unsubscribing with status ${status}.`
      );
    }
  } catch (e) {
    console.error("An error occured while trying to subscribe", e);
  }
}

let socket: WebSocket | null = null;
function openSocket() {
  if (socket?.readyState !== WebSocket.OPEN) {
    socket = new WebSocket("wss://eventsub.wss.twitch.tv/ws");

    // TODO: Maybe have this cache elsewhere?
    const subscriptions: Partial<Record<SubscriptionTypes, SubscriptionData>> =
      {};

    socket.onopen = function (e) {
      console.log(e);

      // socket.send()
    };

    socket.onmessage = async function (e) {
      const message = getMessage(e.data);
      console.log(message);
      console.log(e.data);

      if (!message) {
        console.info("Skipping message", e);
        return;
      }

      if (message.metadata.message_type === "session_welcome") {
        // TODO: ??? TS WHATS WRONG WITH YOU THIS HAS A CLEAR OVERLAP
        const welcomeMessage = message as WelcomeMessage;
        const session = welcomeMessage.payload.id;

        const newMessageSub: ChannelChatMessageEvent = {
          type: "channel.chat.message",
          version: "1",
          condition: {
            broadcaster_user_id: "",
            user_id: "",
          },
          transport: {
            method: "websocket",
            session_id: session,
          },
        };

        const subscriptionData = await subscribe(newMessageSub);
        if (subscriptionData) {
          // TODO: Allow more than one? Close the old ones?
          subscriptions["channel.chat.message"] = subscriptionData.data[0];
        }
      }
    };

    socket.onclose = function (e) {
      console.log(e);
    };

    socket.onerror = function (e) {
      console.error(e);
    };
  }
}

// TODO: Retrieve this token using OAuth2
// TODO: ONLY ASK FOR NECESARY PERMS! (user:read:chat)
const access_token = "";
