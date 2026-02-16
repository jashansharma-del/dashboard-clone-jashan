import { useState } from "react";
import { type BoardComment } from "../../../../../data/commentsStorage";

type BoardCommentsProps = {
    comments: BoardComment[];
    onAddComment: (text: string) => Promise<void>;
    onResolveComment: (commentId: string, resolved: boolean) => Promise<void>;
    isOpen: boolean;
};

export const BoardComments = ({ comments, onAddComment, onResolveComment, isOpen }: BoardCommentsProps) => {
    const [commentText, setCommentText] = useState("");

    const handleAdd = async () => {
        if (!commentText.trim()) return;
        await onAddComment(commentText);
        setCommentText("");
    };

    if (!isOpen) return null;

    return (
        <div className="border-t border-gray-200 dark:border-gray-700 p-3 max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <div className="text-xs font-semibold mb-2 text-gray-600 dark:text-gray-300">Board Comments</div>
            <div className="space-y-2">
                {comments.map((comment) => (
                    <div key={comment.id} className="rounded border dark:border-gray-700 p-2 bg-white dark:bg-gray-800">
                        <div className="text-xs text-gray-500 dark:text-gray-400">{comment.authorId}</div>
                        <div className="text-sm text-gray-900 dark:text-white">{comment.body}</div>
                        <button
                            type="button"
                            className="text-xs text-blue-600 mt-1"
                            onClick={() => onResolveComment(comment.id, !Boolean(comment.resolvedAt))}
                        >
                            {comment.resolvedAt ? "Reopen" : "Resolve"}
                        </button>
                    </div>
                ))}
                {comments.length === 0 && <div className="text-xs text-gray-500">No comments yet.</div>}
            </div>
            <div className="mt-2 flex gap-2">
                <input
                    className="flex-1 border dark:border-gray-700 rounded px-2 py-1 text-sm bg-white dark:bg-gray-800"
                    placeholder="Add comment. Use @email for mentions"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                />
                <button type="button" onClick={handleAdd} className="text-xs px-2 py-1 bg-blue-600 text-white rounded">
                    Add
                </button>
            </div>
        </div>
    );
};
