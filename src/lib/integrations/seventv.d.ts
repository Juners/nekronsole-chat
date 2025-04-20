// Generated using copilot, using this file: https://github.com/SevenTV/SevenTV/blob/2b4f4cb40d5636c74cebad2da4065b79d0508bcf/shared/src/old_types/mod.rs
// Manual adjustements and added extra interfaces missing.

export type UserTypeModel = "REGULAR" | "BOT" | "SYSTEM";
export type UserConnectionPlatformModel =
  | "TWITCH"
  | "YOUTUBE"
  | "DISCORD"
  | "KICK";

export type UserPartialModel = Pick<
  UserModel,
  | "id"
  | "user_type"
  | "username"
  | "display_name"
  | "avatar_url"
  | "style"
  | "connections"
> & { role_ids: UserModel["roles"] };

export interface UserStyle {
  color?: number;
  paint_id?: string | null; // Assuming PaintId is a string
  paint?: object | null; // Assuming CosmeticPaintModel is an object
  badge_id?: string | null; // Assuming BadgeId is a string
  badge?: object | null; // Assuming CosmeticBadgeModel is an object
}

export interface EmoteSetOrigin {
  id: string; // Assuming EmoteSetId is a string
  weight: number;
  slices: number[];
}

export interface ImageHostFile {
  name: string;
  static_name: string;
  width: number;
  height: number;
  frame_count: number;
  size: number;
  format: string;
}

export interface ImageHost {
  url: string;
  files: ImageHostFile[];
}

export interface EmotePartialModel {
  id: string; // Corresponds to EmoteId in Rust
  name: string;
  flags: EmoteFlagsModel; // Assuming EmoteFlagsModel is a bitmask represented as a number
  tags?: string[]; // Skip serializing if empty
  lifecycle: EmoteLifecycleModel;
  state: EmoteVersionState[];
  listed: boolean;
  animated: boolean;
  owner?: UserPartialModel | null;
  host: ImageHost;
}

// export enum EmoteFlagsModel {
//   Private = 1 << 0,
//   Authentic = 1 << 1,
//   ZeroWidth = 1 << 8,
//   Sexual = 1 << 16,
//   Epilepsy = 1 << 17,
//   Edgy = 1 << 18,
//   TwitchDisallowed = 1 << 24
// }

export enum EmoteLifecycleModel {
  Deleted = -1,
  Pending = 0,
  Processing = 1,
  Disabled = 2,
  Live = 3,
  Failed = -2,
}

export enum EmoteVersionState {
  Listed,
  Personal,
  NoPersonal,
}

export interface UserPartialModel {
  id: string; // Corresponds to UserId in Rust
  user_type?: UserTypeModel;
  username: string;
  display_name: string;
  avatar_url?: string; // Skip serializing if empty
  style: UserStyle;
  role_ids?: string[]; // Skip serializing if empty
  connections?: UserConnectionPartialModel[]; // Skip serializing if empty
}

export interface ActiveEmoteModel {
  id: string; // Assuming EmoteId is a string
  name: string;
  flags: number; // Assuming ActiveEmoteFlagModel is a bitmask represented as a number
  timestamp: number;
  actor_id?: string | null; // Assuming UserId is a string
  data?: EmotePartialModel | null;
  origin_id?: string | null; // Assuming EmoteSetId is a string
}

export interface EmoteSetModel {
  id: string; // Assuming EmoteSetId is a string
  name: string;
  flags: number; // Assuming EmoteSetFlagModel is a bitmask represented as a number
  tags: string[];
  immutable: boolean;
  privileged: boolean;
  emotes: ActiveEmoteModel[];
  emote_count: number;
  capacity: number;
  origins: EmoteSetOrigin;
  owner?: UserPartialModel | null;
}

export interface UserEditorModel {
  id: string; // Assuming UserId is a string
  permissions: number; // Assuming UserEditorModelPermission is a bitmask represented as a number
  visible: boolean;
  added_at: number; // Assuming a Unix timestamp
}

export interface UserConnectionModel {
  id: string;
  platform: UserConnectionPlatformModel;
  username: string;
  display_name: string;
  linked_at: number; // Assuming a Unix timestamp
  emote_capacity: number;
  emote_set_id?: string | null; // Assuming EmoteSetId is a string
  emote_set?: EmoteSetModel | null;
  user?: UserModel | null;
}

export interface UserModel {
  id: string; // Assuming UserId is a string
  user_type?: UserTypeModel;
  username: string;
  display_name: string;
  created_at?: number; // Assuming a Unix timestamp
  avatar_url?: string;
  biography?: string;
  style: UserStyle;
  emote_sets?: Partial<EmoteSetModel>[];
  editors?: UserEditorModel[];
  roles?: string[]; // Assuming RoleId is a string
  connections?: UserConnectionModel[];
}
