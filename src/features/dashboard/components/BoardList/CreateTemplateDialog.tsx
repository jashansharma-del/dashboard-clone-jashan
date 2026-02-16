import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { BUILTIN_TEMPLATES } from "../../../../data/templates";

type CreateTemplateDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    selectedTemplateId: string;
    onSelectTemplate: (id: string) => void;
    onCreate: () => void;
};

export default function CreateTemplateDialog({
    isOpen,
    onClose,
    selectedTemplateId,
    onSelectTemplate,
    onCreate,
}: CreateTemplateDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Create from template</DialogTitle>
                    <DialogDescription>Select a starter template and create a board instantly.</DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    {BUILTIN_TEMPLATES.map((template) => (
                        <button
                            key={template.id}
                            type="button"
                            onClick={() => onSelectTemplate(template.id)}
                            className={`w-full text-left rounded border p-3 ${selectedTemplateId === template.id ? "border-blue-500 bg-blue-50/40 dark:bg-blue-900/20" : ""
                                }`}
                        >
                            <div className="font-medium">{template.name}</div>
                            <div className="text-xs text-muted-foreground">{template.description}</div>
                        </button>
                    ))}
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={onCreate}>
                        Create board
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
