interface OIDCDefaultClaims {
  /** The client ID of the application that requested the user’s authorization. */
  aud: string;
  /** The client ID of the application that received the user’s authorization. This contains the same value as {@link aud} */
  azp: string;
  /** The UNIX timestamp of when the token expires. */
  exp: string;
  /** The UNIX timestamp of when the server issued the token. */
  iat: string;
  /** The URI of the issuing authority. */
  iss: string;
  /** The ID of the user that authorized the app. */
  sub: string;
}

interface OIDCCustomClaims {
  /** The email address of the user that authorized the app. */
  email?: null;
  /** A Boolean value that indicates whether Twitch has verified the user’s email address. Is true if Twitch has verified the user’s email address. */
  email_verified?: null;
  /** A URL to the user’s profile image if they included one; otherwise, a default image. */
  picture?: null;
  /** The user’s display name. */
  preferred_username?: null;
  /** The date and time that the user last updated their profile. */
  updated_at?: null;
}

interface OIDCClaimsRequest {
  id_token?: OIDCCustomClaims;
  userinfo?: OIDCCustomClaims;
}
