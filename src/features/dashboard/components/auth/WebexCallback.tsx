import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../../../../store";
import { setCredentials, setError, setLoading } from "../../../../store/authSlice";
import {
  exchangeWebexCodeForToken,
  fetchWebexMe,
  parseWebexCallback,
  persistWebexSession,
} from "./webexAuth";
import { storeWebexPrefs } from "../utils/webexStorage";

export default function WebexCallback() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [message, setMessage] = useState("Completing Webex sign-in...");

  useEffect(() => {
    const run = async () => {
      dispatch(setLoading(true));
      dispatch(setError(null));

      try {
        const { error, errorDescription, accessToken, expiresIn, state, code } =
          parseWebexCallback();

        const storedState = localStorage.getItem("webex_oauth_state");
        if (storedState && state && storedState !== state) {
          throw new Error("Webex sign-in failed: invalid state.");
        }

        if (error) {
          throw new Error(errorDescription || error);
        }

        let tokenResponse = null;

        if (accessToken) {
          tokenResponse = {
            access_token: accessToken,
            expires_in: expiresIn,
          };
        } else if (code) {
          tokenResponse = await exchangeWebexCodeForToken(code);
        } else {
          throw new Error("Webex sign-in failed: missing authorization response.");
        }

        const me = await fetchWebexMe(tokenResponse.access_token);
        const userForStore = persistWebexSession(tokenResponse, me);

        await storeWebexPrefs({
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          expiresAt: tokenResponse.expires_in
            ? Date.now() + tokenResponse.expires_in * 1000
            : undefined,
          userId: me.id,
          email: me.emails?.[0] || me.email,
          name: me.displayName || me.firstName,
        });

        dispatch(setCredentials(userForStore));
        dispatch(setLoading(false));

        setMessage("Webex sign-in complete. Redirecting...");
        navigate("/boards", { replace: true });
      } catch (err) {
        const messageText = err instanceof Error ? err.message : "Webex sign-in failed.";
        dispatch(setError(messageText));
        dispatch(setLoading(false));
        setMessage(messageText);
      }
    };

    run();
  }, [dispatch, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="max-w-md text-center space-y-3">
        <div className="animate-spin h-8 w-8 border-b-2 border-blue-500 rounded-full mx-auto" />
        <p className="text-sm">{message}</p>
        <button
          className="text-blue-400 underline"
          onClick={() => navigate("/", { replace: true })}
          type="button"
        >
          Back to sign in
        </button>
      </div>
    </div>
  );
}
