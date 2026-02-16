import { Archive, Search, Star, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "../../../../shared/components/ui/ui/input";
import { useNavigate } from "react-router-dom";

type BoardFiltersProps = {
    query: string;
    setQuery: (val: string) => void;
    includeArchived: boolean;
    setIncludeArchived: (val: (prev: boolean) => boolean) => void;
    onOpenTemplates: () => void;
    onTriggerImport: () => void;
    allTags: string[];
    activeTag: string;
    setActiveTag: (tag: string) => void;
};

export default function BoardFilters({
    query,
    setQuery,
    includeArchived,
    setIncludeArchived,
    onOpenTemplates,
    onTriggerImport,
    allTags,
    activeTag,
    setActiveTag,
}: BoardFiltersProps) {
    const navigate = useNavigate();

    return (
        <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[260px] flex-1 max-w-xl">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        className="pl-9"
                        placeholder="Search boards, tags, chat content"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>

                <Button type="button" variant="outline" onClick={() => setIncludeArchived((prev) => !prev)}>
                    <Archive className="w-4 h-4 mr-1" />
                    {includeArchived ? "Hide archived" : "Show archived"}
                </Button>

                <Button type="button" variant="outline" onClick={onOpenTemplates}>
                    Templates
                </Button>

                <Button type="button" variant="outline" onClick={() => navigate("/featured")}>
                    <Star className="w-4 h-4 mr-1" />
                    Featured
                </Button>

                <Button type="button" variant="outline" onClick={onTriggerImport}>
                    <Upload className="w-4 h-4 mr-1" />
                    Import
                </Button>
            </div>

            <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                    <button
                        key={tag}
                        type="button"
                        onClick={() => setActiveTag(tag)}
                        className={`text-xs px-3 py-1 rounded-full border ${activeTag === tag ? "bg-primary text-primary-foreground" : "bg-background"
                            }`}
                    >
                        {tag}
                    </button>
                ))}
            </div>
        </section>
    );
}
