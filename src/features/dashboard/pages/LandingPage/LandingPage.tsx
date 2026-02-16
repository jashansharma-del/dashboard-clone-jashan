import { useLandingPage } from "./hooks/useLandingPage";
import { LandingPageHeader, LandingPageGrid, LandingPageDialogs } from "./components";

export default function LandingPage() {
    const actions = useLandingPage();

    return (
        <div className="w-full bg-background text-foreground transition-colors duration-300">
            <div className="p-4 sm:p-6 space-y-8 max-w-full">
                <LandingPageHeader {...actions} />
                <LandingPageGrid {...actions} />
            </div>

            <LandingPageDialogs {...actions} />

            <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
        </div>
    );
}
