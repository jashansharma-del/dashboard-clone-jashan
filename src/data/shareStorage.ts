import { ID, Permission, Query, Role } from "appwrite";
import { databases } from "../features/dashboard/components/utils/authService";
import {
  APPWRITE_COLLECTION_BOARD_INVITES,
  APPWRITE_COLLECTION_BOARD_MEMBERS,
  APPWRITE_COLLECTION_BOARDS,
  APPWRITE_DATABASE_ID,
  assertAppwriteConfig,
  hasCollectionConfig,
} from "./appwriteConfig";
import type { BoardInvite, BoardMember, BoardRole } from "./collabTypes";
export type { BoardInvite, BoardMember, BoardRole } from "./collabTypes";

const memoryMembers = new Map<string, BoardMember[]>();
const memoryInvites = new Map<string, BoardInvite[]>();

function nowIso() {
  return new Date().toISOString();
}

function safeRole(role: string | undefined): BoardRole {
  if (role === "owner" || role === "editor" || role === "viewer") return role;
  return "viewer";
}

function mapMember(doc: any): BoardMember {
  return {
    id: doc.$id,
    boardId: doc.boardId,
    userId: doc.userId,
    role: safeRole(doc.role),
    status: doc.status || "active",
    invitedBy: doc.invitedBy,
    acceptedAt: doc.acceptedAt || null,
    revokedAt: doc.revokedAt || null,
    email: doc.email || null,
  };
}

function mapInvite(doc: any): BoardInvite {
  return {
    id: doc.$id,
    boardId: doc.boardId,
    inviteEmail: doc.inviteEmail,
    role: safeRole(doc.role) as "editor" | "viewer",
    status: doc.status || "pending",
    invitedBy: doc.invitedBy,
    acceptedByUserId: doc.acceptedByUserId || null,
    createdAt: doc.$createdAt,
    expiresAt: doc.expiresAt || null,
  };
}

async function syncBoardAcl(boardId: string): Promise<void> {
  if (!hasCollectionConfig(APPWRITE_COLLECTION_BOARD_MEMBERS)) return;
  const board = await databases.getDocument(
    APPWRITE_DATABASE_ID,
    APPWRITE_COLLECTION_BOARDS,
    boardId
  );
  const ownerId = board.ownerId || board.userId;
  if (!ownerId) return;

  const members = await listBoardMembers(boardId);
  const active = members.filter((member) => member.status === "active");
  const permissions = [
    Permission.read(Role.user(ownerId)),
    Permission.update(Role.user(ownerId)),
    Permission.delete(Role.user(ownerId)),
  ];

  for (const member of active) {
    permissions.push(Permission.read(Role.user(member.userId)));
    if (member.role === "editor") {
      permissions.push(Permission.update(Role.user(member.userId)));
    }
  }

  await databases.updateDocument(
    APPWRITE_DATABASE_ID,
    APPWRITE_COLLECTION_BOARDS,
    boardId,
    {
      lastActivityAt: nowIso(),
    },
    permissions
  );
}

function readMemoryMembers(boardId: string): BoardMember[] {
  return [...(memoryMembers.get(boardId) || [])];
}

function writeMemoryMembers(boardId: string, members: BoardMember[]) {
  memoryMembers.set(boardId, [...members]);
}

function readMemoryInvites(boardId: string): BoardInvite[] {
  return [...(memoryInvites.get(boardId) || [])];
}

function writeMemoryInvites(boardId: string, invites: BoardInvite[]) {
  memoryInvites.set(boardId, [...invites]);
}

export async function listBoardMembers(boardId: string): Promise<BoardMember[]> {
  try {
    assertAppwriteConfig();
    if (!hasCollectionConfig(APPWRITE_COLLECTION_BOARD_MEMBERS)) {
      return readMemoryMembers(boardId);
    }
    const result = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_BOARD_MEMBERS,
      [Query.equal("boardId", [boardId]), Query.limit(200)]
    );
    return result.documents.map(mapMember);
  } catch {
    return readMemoryMembers(boardId);
  }
}

export async function listBoardInvites(boardId: string): Promise<BoardInvite[]> {
  try {
    assertAppwriteConfig();
    if (!hasCollectionConfig(APPWRITE_COLLECTION_BOARD_INVITES)) {
      return readMemoryInvites(boardId);
    }
    const result = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_BOARD_INVITES,
      [Query.equal("boardId", [boardId]), Query.limit(200)]
    );
    return result.documents.map(mapInvite);
  } catch {
    return readMemoryInvites(boardId);
  }
}

export async function listPendingInvitesForEmail(email: string): Promise<BoardInvite[]> {
  try {
    assertAppwriteConfig();
    if (!hasCollectionConfig(APPWRITE_COLLECTION_BOARD_INVITES)) {
      const all = [...memoryInvites.values()].flat();
      return all.filter(
        (invite) =>
          invite.inviteEmail.toLowerCase() === email.toLowerCase() &&
          invite.status === "pending"
      );
    }

    const result = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_BOARD_INVITES,
      [
        Query.equal("inviteEmail", [email]),
        Query.equal("status", ["pending"]),
        Query.limit(100),
      ]
    );
    return result.documents.map(mapInvite);
  } catch {
    const all = [...memoryInvites.values()].flat();
    return all.filter(
      (invite) =>
        invite.inviteEmail.toLowerCase() === email.toLowerCase() &&
        invite.status === "pending"
    );
  }
}

export async function inviteBoardMember(params: {
  boardId: string;
  email: string;
  role: "editor" | "viewer";
  invitedBy: string;
}): Promise<BoardInvite> {
  const inviteEmail = params.email.trim().toLowerCase();
  try {
    assertAppwriteConfig();
    if (!hasCollectionConfig(APPWRITE_COLLECTION_BOARD_INVITES)) {
      throw new Error("Invite collection not configured.");
    }
    const invite = await databases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_BOARD_INVITES,
      ID.unique(),
      {
        boardId: params.boardId,
        inviteEmail,
        role: params.role,
        status: "pending",
        invitedBy: params.invitedBy,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      [
        Permission.read(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ]
    );
    return mapInvite(invite);
  } catch {
    const invites = readMemoryInvites(params.boardId);
    const created: BoardInvite = {
      id: `invite_${ID.unique()}`,
      boardId: params.boardId,
      inviteEmail,
      role: params.role,
      status: "pending",
      invitedBy: params.invitedBy,
      createdAt: nowIso(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    invites.push(created);
    writeMemoryInvites(params.boardId, invites);
    return created;
  }
}

export async function acceptBoardInvite(inviteId: string, user: {
  userId: string;
  email?: string;
}): Promise<void> {
  try {
    assertAppwriteConfig();
    if (!hasCollectionConfig(APPWRITE_COLLECTION_BOARD_INVITES)) {
      throw new Error("Invite collection not configured.");
    }

    const invite = await databases.getDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_BOARD_INVITES,
      inviteId
    );
    if (invite.status !== "pending") {
      throw new Error("Invite is no longer pending.");
    }
    if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
      throw new Error("Invite has expired.");
    }
    if (
      user.email &&
      String(invite.inviteEmail).toLowerCase() !== user.email.toLowerCase()
    ) {
      throw new Error("Invite does not match current account.");
    }

    if (hasCollectionConfig(APPWRITE_COLLECTION_BOARD_MEMBERS)) {
      const existing = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_BOARD_MEMBERS,
        [
          Query.equal("boardId", [invite.boardId]),
          Query.equal("userId", [user.userId]),
          Query.limit(1),
        ]
      );
      if (existing.documents.length > 0) {
        await databases.updateDocument(
          APPWRITE_DATABASE_ID,
          APPWRITE_COLLECTION_BOARD_MEMBERS,
          existing.documents[0].$id,
          {
            role: invite.role,
            status: "active",
            acceptedAt: nowIso(),
            revokedAt: null,
            email: user.email || null,
          }
        );
      } else {
        await databases.createDocument(
          APPWRITE_DATABASE_ID,
          APPWRITE_COLLECTION_BOARD_MEMBERS,
          ID.unique(),
          {
            boardId: invite.boardId,
            userId: user.userId,
            role: invite.role,
            status: "active",
            invitedBy: invite.invitedBy,
            acceptedAt: nowIso(),
            email: user.email || null,
          },
          [
            Permission.read(Role.users()),
            Permission.update(Role.users()),
            Permission.delete(Role.users()),
          ]
        );
      }
    }

    await databases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_BOARD_INVITES,
      inviteId,
      {
        status: "accepted",
        acceptedByUserId: user.userId,
      }
    );

    await syncBoardAcl(invite.boardId);
  } catch (error) {
    for (const [boardId, invites] of memoryInvites.entries()) {
      const idx = invites.findIndex((invite) => invite.id === inviteId);
      if (idx === -1) continue;
      if (invites[idx].status !== "pending") {
        throw new Error("Invite is no longer pending.");
      }
      invites[idx] = {
        ...invites[idx],
        status: "accepted",
        acceptedByUserId: user.userId,
      };
      writeMemoryInvites(boardId, invites);

      const members = readMemoryMembers(boardId);
      const existing = members.find((member) => member.userId === user.userId);
      if (existing) {
        existing.status = "active";
        existing.role = invites[idx].role;
        existing.acceptedAt = nowIso();
        existing.email = user.email || null;
      } else {
        members.push({
          id: `member_${ID.unique()}`,
          boardId,
          userId: user.userId,
          role: invites[idx].role,
          status: "active",
          invitedBy: invites[idx].invitedBy,
          acceptedAt: nowIso(),
          email: user.email || null,
        });
      }
      writeMemoryMembers(boardId, members);
      return;
    }
    throw error;
  }
}

export async function declineBoardInvite(inviteId: string): Promise<void> {
  try {
    assertAppwriteConfig();
    if (!hasCollectionConfig(APPWRITE_COLLECTION_BOARD_INVITES)) {
      throw new Error("Invite collection not configured.");
    }
    await databases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_BOARD_INVITES,
      inviteId,
      { status: "declined" }
    );
  } catch {
    for (const [boardId, invites] of memoryInvites.entries()) {
      const idx = invites.findIndex((invite) => invite.id === inviteId);
      if (idx === -1) continue;
      invites[idx] = { ...invites[idx], status: "declined" };
      writeMemoryInvites(boardId, invites);
      return;
    }
  }
}

export async function updateBoardMemberRole(
  boardId: string,
  memberId: string,
  role: "editor" | "viewer"
): Promise<void> {
  try {
    assertAppwriteConfig();
    if (!hasCollectionConfig(APPWRITE_COLLECTION_BOARD_MEMBERS)) {
      throw new Error("Members collection not configured.");
    }
    await databases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_BOARD_MEMBERS,
      memberId,
      { role }
    );
    await syncBoardAcl(boardId);
  } catch {
    const members = readMemoryMembers(boardId);
    const idx = members.findIndex((member) => member.id === memberId);
    if (idx !== -1) {
      members[idx] = { ...members[idx], role };
      writeMemoryMembers(boardId, members);
    }
  }
}

export async function revokeBoardMember(boardId: string, memberId: string): Promise<void> {
  try {
    assertAppwriteConfig();
    if (!hasCollectionConfig(APPWRITE_COLLECTION_BOARD_MEMBERS)) {
      throw new Error("Members collection not configured.");
    }
    await databases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_BOARD_MEMBERS,
      memberId,
      {
        status: "revoked",
        revokedAt: nowIso(),
      }
    );
    await syncBoardAcl(boardId);
  } catch {
    const members = readMemoryMembers(boardId);
    const idx = members.findIndex((member) => member.id === memberId);
    if (idx !== -1) {
      members[idx] = {
        ...members[idx],
        status: "revoked",
        revokedAt: nowIso(),
      };
      writeMemoryMembers(boardId, members);
    }
  }
}

export async function getBoardRole(
  boardId: string,
  userId: string
): Promise<BoardRole | null> {
  try {
    const board = await databases.getDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_BOARDS,
      boardId
    );
    const ownerId = board.ownerId || board.userId;
    if (ownerId === userId) return "owner";

    const members = await listBoardMembers(boardId);
    const activeMember = members.find(
      (member) => member.userId === userId && member.status === "active"
    );
    return activeMember ? activeMember.role : null;
  } catch {
    const members = readMemoryMembers(boardId);
    const activeMember = members.find(
      (member) => member.userId === userId && member.status === "active"
    );
    return activeMember ? activeMember.role : null;
  }
}

export async function canEditBoard(boardId: string, userId: string): Promise<boolean> {
  const role = await getBoardRole(boardId, userId);
  return role === "owner" || role === "editor";
}
