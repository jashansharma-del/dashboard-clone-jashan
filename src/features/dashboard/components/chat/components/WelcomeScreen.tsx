type WelcomeScreenProps = {
    onSuggestionClick: (text: string) => void;
};

export const WelcomeScreen = ({ onSuggestionClick }: WelcomeScreenProps) => {
    const suggestions = [
        "Analyze sales performance",
        "Create a pie chart",
        "Summarize this data",
        "Generate insights",
    ];

    return (
        <div className="flex flex-col items-center justify-center gap-6 text-center h-full">
            <img src="/Disco-AI-Assistant.png" className="w-24 h-24 rounded-full bg-blue-50 dark:bg-gray-700 p-3" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">How can I help today?</h2>
            <div className="w-full max-w-md flex flex-col gap-3">
                {suggestions.map((text, i) => (
                    <button
                        key={i}
                        onClick={() => onSuggestionClick(text)}
                        className="border dark:border-gray-700 rounded-lg px-4 py-3 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                        {text}
                    </button>
                ))}
            </div>
        </div>
    );
};
