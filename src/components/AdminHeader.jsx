import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Popconfirm } from "antd";
import { logout } from "../store/authSlice";
import {
  acquireSocketConnection,
  releaseSocketConnection,
} from "../config/socketConfig";
import smsIphoneSound from "../assets/sms_iphone.mp3";

const titles = {
  "/dashboard": "Dashboard",
  "/employees": "Hodimlar",
  "/rooms": "Xonalar",
  "/guest-checkin": "Yangi Mehmon",
  "/guests-active": "Active Mijozlar",
  "/guests-history": "Mijozlar Tarixi",
  "/guests-debtors": "Qarzdorlar",
  "/attendance": "Davomat",
  "/expenses": "Xarajatlar",
  "/finance": "Moliya",
  "/reports": "Hisobotlar",
};

function AdminHeader() {
  const location = useLocation();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);
  const audioRef = useRef(null);
  const previousPendingCountRef = useRef(null);
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const isGuestsRealtimePage =
    location.pathname === "/guests-active" ||
    location.pathname === "/guests-debtors";
  const shouldConnectVipSocket =
    isAdmin && Boolean(token) && !isGuestsRealtimePage;
  const [pendingCount, setPendingCount] = useState(0);
  const title = titles[location.pathname] || "Admin Panel";
  const name = user
    ? `${user.firstname || ""} ${user.lastname || ""}`.trim()
    : "Guest";

  useEffect(() => {
    audioRef.current = new Audio(smsIphoneSound);
    audioRef.current.preload = "auto";
    return () => {
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!shouldConnectVipSocket) {
      previousPendingCountRef.current = null;
      return;
    }

    const socket = acquireSocketConnection(token);
    if (!socket) return;

    const handlePendingCount = ({ count } = {}) => {
      const nextCount = Number(count);
      if (!Number.isFinite(nextCount)) return;
      setPendingCount(nextCount);
    };

    socket.on("vip_pending_count", handlePendingCount);

    return () => {
      socket.off("vip_pending_count", handlePendingCount);
      releaseSocketConnection(socket);
    };
  }, [shouldConnectVipSocket, token]);

  useEffect(() => {
    if (!isAdmin) return;

    const previousCount = previousPendingCountRef.current;
    if (previousCount !== null && pendingCount > previousCount) {
      const playNotificationSound = async () => {
        try {
          if (!audioRef.current) return;
          audioRef.current.currentTime = 0;
          await audioRef.current.play();
        } catch (_) {
          // Brauzer autoplay bloklagan holatda xatoni yutib ketamiz
        }
      };
      playNotificationSound();
    }
    previousPendingCountRef.current = pendingCount;
  }, [isAdmin, pendingCount]);

  return (
    <header className="admin-header">
      <h1>{title}</h1>
      <div className="header-right">
        {isAdmin ? (
          <Link
            className="header-icon-btn header-bell-wrap"
            to="/guests-active"
            title="VIP so'rovlar"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path
                d="M7 10C7 7.24 9.24 5 12 5C14.76 5 17 7.24 17 10V13.6L18.6 15.2V16H5.4V15.2L7 13.6V10Z"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M10 18C10.35 18.6 11.02 19 12 19C12.98 19 13.65 18.6 14 18"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
            {pendingCount > 0 ? (
              <span className="bell-badge">
                {pendingCount > 9 ? "9+" : pendingCount}
              </span>
            ) : null}
          </Link>
        ) : null}
        <div className="header-user">{name || "Admin"}</div>
        <Popconfirm
          title="Tizimdan chiqish"
          description="Rostdan ham chiqmoqchimisiz?"
          okText="Ha, chiqish"
          cancelText="Bekor"
          onConfirm={() => dispatch(logout())}
          overlayClassName="hotel-popconfirm"
        >
          <button className="header-icon-btn" title="Chiqish">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path
                d="M15 7L20 12L15 17"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path d="M20 12H9" stroke="currentColor" strokeWidth="2" />
              <path
                d="M13 5H6C4.9 5 4 5.9 4 7V17C4 18.1 4.9 19 6 19H13"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </button>
        </Popconfirm>
      </div>
    </header>
  );
}

export default AdminHeader;
