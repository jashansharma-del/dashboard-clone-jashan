import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../../store";
import { setTheme } from "../../store/uiSlice";
import { setDarkTheme, setLightTheme } from "../../lib/theme";
import authService from "../../features/dashboard/components/utils/authService";

export const useAppTheme = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { theme } = useSelector((state: RootState) => state.ui);
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);
    const [themeInitialized, setThemeInitialized] = useState(false);

    // Initialize theme on app start and sync with Redux state
    useEffect(() => {
        let cancelled = false;
        const initTheme = async () => {
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            let initialTheme: "dark" | "light" = prefersDark ? "dark" : "light";

            if (isAuthenticated) {
                const pref = await authService.getThemePref();
                if (pref) initialTheme = pref;
            }

            if (cancelled) return;
            dispatch(setTheme(initialTheme));
            setThemeInitialized(true);
        };

        initTheme();
        return () => {
            cancelled = true;
        };
    }, [dispatch, isAuthenticated]);

    // Sync theme changes to DOM
    useEffect(() => {
        if (theme === "dark") {
            setDarkTheme();
        } else {
            setLightTheme();
        }
        if (themeInitialized && isAuthenticated) {
            authService.setThemePref(theme);
        }
    }, [theme, themeInitialized, isAuthenticated]);

    return { theme, themeInitialized };
};
