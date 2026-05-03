"use client";
import { useEffect, useState } from "react";
import { getNotifications, markAllRead } from "../../../lib/api";

const TYPE_ICON = { new_tenant: "◉", new_issue: "⚡", low_tokens: "◇", system_alert: "⚠", trial_expiring: "◈", new_intel: "◎" };

export default function NotificationsPage() {
  const [data, setData]     = useState({ notifications: [], unread: 0 });
  const [loading, setLoading] = useState(false);

  const load = () => getNotifications().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleReadAll = async () => {
    setLoading(true);
    await markAllRead().catch(() => {});
    await load();
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Notifications</h1>
          <p className="text-[#555] text-sm mt-1">{data.unread} unread</p>
        </div>
        {data.unread > 0 && (
          <button onClick={handleReadAll} disabled={loading}
            className="text-xs text-[#666] border border-[#2a2a2a] px-3 py-1.5 rounded-lg hover:border-[#444] hover:text-white transition disabled:opacity-50">
            {loading ? "Marking…" : "Mark all read"}
          </button>
        )}
      </div>

      {data.notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-4xl mb-4">◎</div>
          <p className="text-[#444] text-sm">No notifications yet — activity will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.notifications.map((n) => (
            <div key={n.id} className={`bg-[#111] border rounded-xl p-4 flex gap-4 transition ${n.read ? "border-[#161616] opacity-50" : "border-[#2a2a2a]"}`}>
              <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center text-[#00c853] shrink-0">
                {TYPE_ICON[n.type] || "◈"}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm">{n.title}</p>
                  {!n.read && <span className="w-2 h-2 bg-[#00c853] rounded-full shrink-0 mt-1" />}
                </div>
                {n.body && <p className="text-[#555] text-xs mt-0.5">{n.body}</p>}
                <p className="text-[#333] text-xs mt-1">{new Date(n.created_at).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
