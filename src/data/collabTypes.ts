export type BoardRole = "owner" | "editor" | "viewer";

export type MemberStatus = "pending" | "active" | "revoked" | "declined";

export type InviteStatus = "pending" | "accepted" | "expired" | "revoked" | "declined";

export type BoardEventType =
  | "node_add"
  | "node_update"
  | "node_delete"
  | "share_invite"
  | "share_accept"
  | "share_revoke"
  | "comment_add"
  | "comment_resolve"
  | "restore_version";

export type BoardMember = {
  id: string;
  boardId: string;
  userId: string;
  role: BoardRole;
  status: MemberStatus;
  invitedBy?: string;
  acceptedAt?: string | null;
  revokedAt?: string | null;
  email?: string | null;
};

export type BoardInvite = {
  id: string;
  boardId: string;
  inviteEmail: string;
  role: Exclude<BoardRole, "owner">;
  status: InviteStatus;
  invitedBy: string;
  acceptedByUserId?: string | null;
  createdAt?: string;
  expiresAt?: string | null;
};

export type BoardEvent = {
  id: string;
  boardId: string;
  actorId: string;
  eventType: BoardEventType;
  payload: Record<string, unknown>;
  createdAt?: string;
};
