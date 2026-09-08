import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { chatService } from '../../services';
import { connectSocket, getSocket } from '../../services/socket';
import { useToast } from '../../hooks/useToast';

export default function ChatPage() {
  const toast = useToast();
  const { accessToken, user } = useSelector((s) => s.auth);
  const [params, setParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(params.get('c') || '');
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [typing, setTyping] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  const loadConversations = useCallback(async () => {
    const { data } = await chatService.listConversations();
    setConversations(data.data);
  }, []);

  const loadMessages = useCallback(async (id) => {
    if (!id) return;
    const { data } = await chatService.listMessages(id, { limit: 100 });
    setMessages(data.data);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await loadConversations();
      } catch (err) {
        if (mounted) toast.apiError(err, 'Failed to load chats');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadConversations, toast]);

  useEffect(() => {
    if (!accessToken) return undefined;
    const socket = getSocket() || connectSocket(accessToken);
    if (!socket) return undefined;

    const onMessage = (msg) => {
      if (msg.conversationId === activeId) {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      }
      loadConversations();
    };

    const onTyping = (payload) => {
      if (payload.conversationId !== activeId) return;
      if (payload.userId === user?.id) return;
      setTyping(payload.isTyping ? `${payload.name} is typing…` : '');
    };

    socket.on('chat:message', onMessage);
    socket.on('chat:typing', onTyping);
    socket.on('chat:notify', () => loadConversations());

    return () => {
      socket.off('chat:message', onMessage);
      socket.off('chat:typing', onTyping);
    };
  }, [accessToken, activeId, user?.id, loadConversations]);

  useEffect(() => {
    if (!activeId) return;
    setParams({ c: activeId });
    loadMessages(activeId);
    const socket = getSocket();
    socket?.emit('chat:join', { conversationId: activeId });
  }, [activeId, loadMessages, setParams]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!body.trim() || !activeId) return;
    const text = body.trim();
    setBody('');
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('chat:message', { conversationId: activeId, body: text }, (ack) => {
        if (!ack?.ok) toast.error(ack?.message || 'Send failed');
      });
      socket.emit('chat:typing', { conversationId: activeId, isTyping: false });
    } else {
      try {
        const { data } = await chatService.sendMessage(activeId, text);
        setMessages((prev) => [...prev, data.data]);
        await loadConversations();
      } catch (err) {
        toast.apiError(err, 'Send failed');
      }
    }
  };

  const startSupport = async () => {
    try {
      const { data } = await chatService.start({
        type: 'support',
        subject: 'Support request',
        message: 'Hello, I need help.',
      });
      await loadConversations();
      setActiveId(data.data.id);
    } catch (err) {
      toast.apiError(err, 'Could not start support chat');
    }
  };

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
  }

  return (
    <div className="row g-3 chat-layout">
      <div className="col-lg-4">
        <div className="panel-card h-100 d-flex flex-column">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="h6 mb-0">Conversations</h2>
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={startSupport}>
              Support
            </button>
          </div>
          <div className="list-group list-group-flush flex-grow-1 overflow-auto" style={{ maxHeight: 520 }}>
            {conversations.length === 0 && (
              <div className="text-secondary small">No conversations yet. Start one from a property or support.</div>
            )}
            {conversations.map((c) => {
              const other = c.participants.find((p) => p.id !== user?.id);
              return (
                <button
                  type="button"
                  key={c.id}
                  className={`list-group-item list-group-item-action ${activeId === c.id ? 'active' : ''}`}
                  onClick={() => setActiveId(c.id)}
                >
                  <div className="d-flex justify-content-between">
                    <strong className="text-truncate">
                      {c.property?.title || c.subject || other?.name || c.type}
                    </strong>
                    {c.unreadCount > 0 && (
                      <span className="badge text-bg-danger">{c.unreadCount}</span>
                    )}
                  </div>
                  <small className={activeId === c.id ? '' : 'text-secondary'}>
                    {c.lastMessage?.body || 'No messages'}
                  </small>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="col-lg-8">
        <div className="panel-card h-100 d-flex flex-column" style={{ minHeight: 520 }}>
          {!activeId ? (
            <div className="text-secondary m-auto">Select a conversation</div>
          ) : (
            <>
              <div className="flex-grow-1 overflow-auto mb-3" style={{ maxHeight: 420 }}>
                {messages.map((m) => {
                  const mine = m.sender?.id === user?.id;
                  return (
                    <div key={m.id} className={`d-flex mb-2 ${mine ? 'justify-content-end' : 'justify-content-start'}`}>
                      <div className={`chat-bubble ${mine ? 'mine' : 'theirs'}`}>
                        {!mine && <div className="small fw-semibold mb-1">{m.sender?.name}</div>}
                        <div>{m.body}</div>
                        <div className="small opacity-75 mt-1">{new Date(m.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              {typing && <div className="small text-secondary mb-2">{typing}</div>}
              <form onSubmit={send} className="d-flex gap-2">
                <input
                  className="form-control"
                  value={body}
                  onChange={(e) => {
                    setBody(e.target.value);
                    getSocket()?.emit('chat:typing', {
                      conversationId: activeId,
                      isTyping: Boolean(e.target.value),
                    });
                  }}
                  placeholder="Type a message"
                />
                <button type="submit" className="btn btn-primary" disabled={!body.trim()}>
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
