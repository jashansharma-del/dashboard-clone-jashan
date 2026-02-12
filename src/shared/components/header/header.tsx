import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../../store';
import { toggleTheme } from '../../../store/uiSlice';
import { logout } from '../../../store/authSlice';
import { broadcastLogout } from '../../../lib/broadcast';
import {
  Plus,
  Search,
  Sun,
  Moon,
  Wand2,
  HelpCircle,
  Bell,
  User,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { Button } from "../ui/button/button";
import { Input } from "../ui/ui/input";
import { listNotifications, markNotificationRead, type UserNotification } from "../../../data/notificationsStorage";


export default function Header() {
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useSelector((state: RootState) => state.ui);
  const navigate = useNavigate();
  
  const [open, setOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [inbox, setInbox] = useState<UserNotification[]>([]);
  
  const userName = useSelector((state: RootState) => {
    return state.auth.user?.name || "User";
  });
  const userId = useSelector((state: RootState) => state.auth.user?.$id || "");
  const uiNotifications = useSelector((state: RootState) => state.ui.notifications);

  const unreadCount =
    inbox.filter((n) => !n.readAt).length + uiNotifications.length;

  const openInbox = async () => {
    if (!userId) return;
    setInboxOpen((prev) => !prev);
    const loaded = await listNotifications(userId);
    setInbox(loaded);
  };

  const onRead = async (id: string) => {
    await markNotificationRead(id);
    setInbox((prev) =>
      prev.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item))
    );
  };

  const handleToggleTheme = () => {
    dispatch(toggleTheme());
  };

  const handleLogout = async () => {
    try {
      console.log("Logout clicked");
      await dispatch(logout());
      broadcastLogout();
      navigate('/', { replace: true });
    } catch (err) {
      console.error(err);
    }
  };
  return (
    <header className="h-16 bg-gradient-to-r from-gray-800 to-gray-900 flex items-center px-6 transition-colors duration-300">
      <div className="flex w-full items-center justify-between text-white">
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <img src="/DotsNine.png" alt="Menu" className="w-8 h-8 sm:w-10 sm:h-10" />
          <img src="/Logo@2x.png" alt="Logo" className="w-8 h-6 sm:w-9 sm:h-6" />
          <div className="leading-tight hidden md:block">
            <p className="text-gray-300 text-xs sm:text-sm">Disco Commerce</p>
            <p className="text-base sm:text-lg font-semibold">Home</p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 md:gap-4 flex-grow justify-end min-w-0">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white hidden md:flex">
            <Plus className="w-4 h-4 mr-1" />
            Create
            <ChevronDown className="w-4 h-4 ml-1" />
          </Button>

          <div className="h-6 w-px bg-white/30 hidden md:block" />

          <div className="relative hidden md:block min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search"
              className="pl-9 bg-gray-700 border-none text-white placeholder:text-gray-400 w-16 md:w-32 lg:w-64"
            />
          </div>

          <div 
            onClick={handleToggleTheme}
            className="w-5 h-5 cursor-pointer flex items-center justify-center flex-shrink-0"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </div>
          
          <Wand2 className="w-5 h-5 cursor-pointer flex-shrink-0 hidden lg:flex" />
          <HelpCircle className="w-5 h-5 cursor-pointer flex-shrink-0 hidden lg:flex" />
          <div className="relative hidden lg:block">
            <Bell className="w-5 h-5 cursor-pointer flex-shrink-0" onClick={openInbox} />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 rounded-full bg-red-500 text-[10px] text-white px-1.5 py-0.5">
                {unreadCount}
              </span>
            )}
            {inboxOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-md border border-gray-700 bg-gray-800 p-2 shadow-xl z-[120]">
                <div className="text-xs font-semibold text-gray-300 px-2 py-1">Inbox</div>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {inbox.length === 0 && (
                    <div className="text-xs text-gray-400 px-2 py-2">No notifications</div>
                  )}
                  {inbox.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`w-full text-left rounded px-2 py-2 hover:bg-gray-700 ${
                        item.readAt ? "opacity-70" : ""
                      }`}
                      onClick={() => onRead(item.id)}
                    >
                      <div className="text-xs text-gray-200">{item.title}</div>
                      <div className="text-[11px] text-gray-400">{item.body}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative flex-shrink-0">
            <div
              onClick={() => setOpen(!open)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <User className="w-5 h-5" />
              <div className="leading-tight hidden sm:block">
                <p className="text-sm font-medium text-white truncate max-w-[60px]">{userName}</p>
                <p className="text-xs text-gray-400 hidden md:block">Logged in</p>
              </div>
              <ChevronDown className="w-4 h-4" />
            </div>

            {open && (
              <div className="bg-gray-800 text-white absolute right-0 mt-2 w-40 rounded shadow-md z-[100]">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-700"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
