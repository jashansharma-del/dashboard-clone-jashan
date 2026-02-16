import PendingInvites from "@/features/dashboard/components/BoardList/PendingInvites";
import BoardFilters from "@/features/dashboard/components/BoardList/BoardFilters";
import { acceptBoardInvite, declineBoardInvite } from "@/data/shareStorage";

interface LandingPageHeaderProps {
    userId: string | null;
    userEmail: string;
    pendingInvites: any[];
    refreshBoards: (uid: string) => void;
    query: string;
    setQuery: (q: string) => void;
    includeArchived: boolean;
    setIncludeArchived: (val: any) => void;
    importRef: React.RefObject<HTMLInputElement | null>;
    allTags: string[];
    activeTag: string;
    setActiveTag: (tag: string) => void;
}

export default function LandingPageHeader({
    userId, userEmail, pendingInvites, refreshBoards,
    query, setQuery, includeArchived, setIncludeArchived,
    importRef, allTags, activeTag, setActiveTag
}: LandingPageHeaderProps) {
    return (
        <>
            <PendingInvites
                invites={pendingInvites}
                onAccept={(id) => acceptBoardInvite(id, { userId: userId!, email: userEmail }).then(() => refreshBoards(userId!))}
                onDecline={(id) => declineBoardInvite(id).then(() => refreshBoards(userId!))}
            />

            <BoardFilters
                query={query} setQuery={setQuery}
                includeArchived={includeArchived} setIncludeArchived={setIncludeArchived}
                onOpenTemplates={() => { }}
                onTriggerImport={() => importRef.current?.click()}
                allTags={allTags} activeTag={activeTag} setActiveTag={setActiveTag}
            />
        </>
    );
}
