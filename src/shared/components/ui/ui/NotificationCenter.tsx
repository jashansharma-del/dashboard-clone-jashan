import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../../../store";
import { removeNotification } from "../../../../store/uiSlice";

export default function NotificationCenter() {
  const dispatch = useDispatch();
  const notifications = useSelector((state: RootState) => state.ui.notifications);

  useEffect(() => {
    if (notifications.length === 0) return;
    const timers = notifications.map((notification) =>
      window.setTimeout(() => {
        dispatch(removeNotification(notification.id));
      }, 3800)
    );
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [notifications, dispatch]);

  return (
    <div className="fixed right-4 top-20 z-[120] space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`rounded-md border px-3 py-2 text-sm shadow ${
            notification.type === "error"
              ? "bg-red-50 border-red-200 text-red-800"
              : notification.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : notification.type === "warning"
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          {notification.message}
        </div>
      ))}
    </div>
  );
}
