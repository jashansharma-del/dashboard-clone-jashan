import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "../../../../shared/components/ui/ui/input";
import {
    inviteBoardMember,
    listBoardInvites,
    listBoardMembers,
    revokeBoardMember,
    updateBoardMemberRole,
    type BoardInvite,
} from "../../../../data/shareStorage";
import { type BoardMember } from "../../../../data/collabTypes";
import { withRetry } from "../../../../lib/retry";
import { useDispatch } from "react-redux";
import { addNotification } from "../../../../store/uiSlice";
import { getWebexAccessToken } from "../../../../features/dashboard/components/utils/webexStorage";
import { searchWebexPeopleByEmail, sendWebexDirectMessage } from "../../../../features/dashboard/components/auth/webexAuth";

type ShareBoardDialogProps = {
    boardId: string | null;
    onClose: () => void;
    userId: string;
};

export default function ShareBoardDialog({ boardId, onClose, userId }: ShareBoardDialogProps) {
    const dispatch = useDispatch();
    const [shareEmail, setShareEmail] = useState("");
    const [shareRole, setShareRole] = useState<"editor" | "viewer">("viewer");
    const [shareError, setShareError] = useState<string | null>(null);
    const [shareSuccess, setShareSuccess] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [members, setMembers] = useState<BoardMember[]>([]);
    const [invites, setInvites] = useState<BoardInvite[]>([]);

    useEffect(() => {
        if (boardId) {
            setShareEmail("");
            setShareRole("viewer");
            setShareError(null);
            setShareSuccess(null);
            setMembers([]);
            setInvites([]);

            const load = async () => {
                try {
                    const [m, i] = await Promise.all([listBoardMembers(boardId), listBoardInvites(boardId)]);
                    setMembers(m);
                    setInvites(i);
                } catch (e) {
                    console.error("Failed to load share info", e);
                }
            };
            load();
        }
    }, [boardId]);

    const handleSendInvite = async () => {
        if (!boardId || !userId) return;
        const email = shareEmail.trim().toLowerCase();
        if (!email) {
            setShareError("Enter a Webex email address first.");
            return;
        }

        setIsSending(true);
        setShareError(null);
        setShareSuccess(null);

        try {
            // 1. Get Webex Token
            const token = await getWebexAccessToken();
            if (!token) {
                setShareError("Please log in to Webex first.");
                return;
            }

            // 2. Search for Webex user
            const people = await searchWebexPeopleByEmail(token, email);
            if (!people.length) {
                setShareError("Webex user not found. Ensure the email is correct.");
                return;
            }
            const targetPersonId = people[0].id;

            // 3. Create Invite in system (for permissions)
            await withRetry(
                () => inviteBoardMember({ boardId, email, role: shareRole, invitedBy: userId }),
                { retries: 2, baseDelayMs: 300 }
            );

            // 4. Send Webex Direct Message
            const boardLink = `${window.location.origin}/newboard/${boardId}`;
            await sendWebexDirectMessage(token, {
                toPersonId: targetPersonId,
                markdown: `**${window.location.origin.includes('localhost') ? 'Disco' : 'Disco Dashboard'} Board Share**\n\nYou've been invited to collab on a board as an **${shareRole}**.\n\n[Click here to open the board](${boardLink})`,
            });

            const [loadedMembers, loadedInvites] = await Promise.all([
                listBoardMembers(boardId),
                listBoardInvites(boardId),
            ]);
            setMembers(loadedMembers);
            setInvites(loadedInvites);
            setShareSuccess(`Webex message sent to ${email}. They can now access the board.`);
            setShareEmail("");
            dispatch(addNotification({ message: "Shared via Webex!", type: "success" }));
        } catch (error) {
            setShareError(error instanceof Error ? error.message : "Failed to share via Webex.");
        } finally {
            setIsSending(false);
        }
    };

    const handleChangeRole = async (memberId: string, role: "editor" | "viewer") => {
        if (!boardId) return;
        await updateBoardMemberRole(boardId, memberId, role);
        setMembers(await listBoardMembers(boardId));
    };

    const handleRevokeMember = async (memberId: string) => {
        if (!boardId) return;
        await revokeBoardMember(boardId, memberId);
        setMembers(await listBoardMembers(boardId));
    };

    return (
        <Dialog open={!!boardId} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Share via Webex</DialogTitle>
                    <DialogDescription>
                        Send a direct Webex message with a board link. Recipients must accept the invite to gain access.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            type="email"
                            value={shareEmail}
                            onChange={(e) => setShareEmail(e.target.value)}
                            placeholder="user@webex.com"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleSendInvite();
                                }
                            }}
                        />
                        <select
                            value={shareRole}
                            onChange={(e) => setShareRole(e.target.value as "editor" | "viewer")}
                            className="border rounded px-2 text-sm"
                        >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                        </select>
                        <Button type="button" onClick={handleSendInvite} disabled={isSending}>
                            {isSending ? "Sending..." : "Share via Webex"}
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-md border p-3 max-h-64 overflow-y-auto">
                            <h4 className="text-sm font-semibold mb-2">Active members</h4>
                            <div className="space-y-2">
                                {members
                                    .filter((member) => member.status === "active")
                                    .map((member) => (
                                        <div key={member.id} className="border rounded p-2">
                                            <div className="text-sm font-medium">{member.email || member.userId}</div>
                                            <div className="text-xs text-muted-foreground mb-2">{member.role}</div>
                                            {member.role !== "owner" && (
                                                <div className="flex gap-2">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleChangeRole(member.id, member.role === "viewer" ? "editor" : "viewer")}
                                                    >
                                                        Make {member.role === "viewer" ? "Editor" : "Viewer"}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleRevokeMember(member.id)}
                                                    >
                                                        Revoke
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                {members.filter((member) => member.status === "active").length === 0 && (
                                    <div className="text-xs text-muted-foreground">No active members.</div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-md border p-3 max-h-64 overflow-y-auto">
                            <h4 className="text-sm font-semibold mb-2">Invites</h4>
                            <div className="space-y-2">
                                {invites.map((invite) => (
                                    <div key={invite.id} className="border rounded p-2">
                                        <div className="text-sm font-medium">{invite.inviteEmail}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {invite.role} · {invite.status}
                                        </div>
                                    </div>
                                ))}
                                {invites.length === 0 && (
                                    <div className="text-xs text-muted-foreground">No invites sent yet.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {shareError && <p className="text-sm text-red-600">{shareError}</p>}
                    {shareSuccess && <p className="text-sm text-green-600">{shareSuccess}</p>}
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
