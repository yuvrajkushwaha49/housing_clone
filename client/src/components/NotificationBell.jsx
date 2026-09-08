import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { leadService } from '../services';
import { connectSocket, getSocket } from '../services/socket';
import { PANEL_HOME } from '../constants';

const MAX_ITEMS = 30;

export default function NotificationBell() {
  const { accessToken, user } = useSelector((s) => s.auth);
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);

  const unread = items.length;

  const mergeIncoming = (incoming) => {
    if (!incoming?.length) return;
    setItems((prev) => {
      const map = new Map(prev.map((n) => [n.id, n]));
      incoming.forEach((n) => {
        if (n?.id) map.set(n.id, n);
      });
      return Array.from(map.values())
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, MAX_ITEMS);
    });
  };

  const ackDelivered = async (ids) => {
    const clean = [...new Set((ids || []).filter(Boolean))];
    if (!clean.length) return;
    try {
      await leadService.ackNotifications(clean);
    } catch {
      /* keep trying next sync — stay in DB until ack succeeds */
    }
  };

  useEffect(() => {
    if (!accessToken) {
      setItems([]);
      return undefined;
    }

    let cancelled = false;

    const pullPending = async () => {
      try {
        const { data } = await leadService.listNotifications({ limit: 30 });
        const pending = data.data || [];
        if (cancelled) return;
        mergeIncoming(pending);
        // Client has received them — remove from DB
        await ackDelivered(pending.map((n) => n.id));
      } catch {
        /* ignore */
      }
    };

    pullPending();

    const socket = getSocket() || connectSocket(accessToken);

    const onNew = (payload) => {
      if (!payload?.id) return;
      mergeIncoming([payload]);
      // Live delivery — drop from DB once client has it
      ackDelivered([payload.id]);
    };

    socket?.on('notification:new', onNew);
    return () => {
      cancelled = true;
      socket?.off('notification:new', onNew);
    };
  }, [accessToken]);

  const openItem = (n) => {
    setItems((prev) => prev.filter((x) => x.id !== n.id));
    setOpen(false);

    if (n.data?.conversationId) {
      navigate(`${PANEL_HOME[user.role.code].replace('/dashboard', '')}/chat?c=${n.data.conversationId}`);
      return;
    }
    if (n.data?.ticketId) {
      const base = PANEL_HOME[user.role.code].replace('/dashboard', '');
      navigate(`${base}/tickets/${n.data.ticketId}`);
      return;
    }
    if (n.type?.startsWith('builder.profile.')) {
      const base = PANEL_HOME[user.role.code].replace('/dashboard', '');
      navigate(`${base}/profile`);
      return;
    }
    if (n.type?.startsWith('lead.') || n.data?.leadId || n.type?.startsWith('booking.')) {
      const base = PANEL_HOME[user.role.code].replace('/dashboard', '');
      navigate(n.type?.startsWith('booking.') ? `${base}/bookings` : `${base}/leads`);
      return;
    }
    navigate(PANEL_HOME[user.role.code]);
  };

  const clearAll = async () => {
    setItems([]);
    try {
      await leadService.markAllRead();
    } catch {
      /* ignore */
    }
  };

  if (!accessToken) return null;

  return (
    <div className="dropdown">
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary position-relative"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
      >
        <i className="bi bi-bell" />
        {unread > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill text-bg-danger">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="dropdown-menu dropdown-menu-end show p-0 notification-menu" style={{ minWidth: 320 }}>
          <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
            <strong className="small">Notifications</strong>
            {items.length > 0 && (
              <button type="button" className="btn btn-link btn-sm p-0" onClick={clearAll}>
                Clear all
              </button>
            )}
          </div>
          <div style={{ maxHeight: 320, overflow: 'auto' }}>
            {items.length === 0 && (
              <div className="px-3 py-3 text-secondary small">No notifications</div>
            )}
            {items.map((n) => (
              <button
                type="button"
                key={n.id}
                className="dropdown-item text-wrap py-2 fw-semibold"
                onClick={() => openItem(n)}
              >
                <div>{n.title}</div>
                <small className="text-secondary d-block">{n.body}</small>
                <small className="text-secondary">{new Date(n.createdAt).toLocaleString()}</small>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
