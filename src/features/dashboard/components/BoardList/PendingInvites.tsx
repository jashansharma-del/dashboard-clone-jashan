import { Button } from "@/components/ui/button";
import { type BoardInvite } from "../../../../data/shareStorage";

type PendingInvitesProps = {
    invites: BoardInvite[];
    onAccept: (id: string) => void;
    onDecline: (id: string) => void;
};

export default function PendingInvites({ invites, onAccept, onDecline }: PendingInvitesProps) {
    if (invites.length === 0) return null;

    return (
        <section className="rounded-xl border p-4 bg-card">
            <h3 className="font-semibold mb-3">Pending invites</h3>
            <div className="space-y-2">
                {invites.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between gap-3 border rounded p-2 text-sm">
                        <div>
                            <div className="font-medium">Board: {invite.boardId}</div>
                            <div className="text-muted-foreground">Role: {invite.role}</div>
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" size="sm" onClick={() => onAccept(invite.id)}>
                                Accept
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => onDecline(invite.id)}>
                                Decline
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
