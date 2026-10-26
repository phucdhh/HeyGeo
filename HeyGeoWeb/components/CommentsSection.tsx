'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import LatexRenderer from './LatexRenderer';

type Visibility = 'PUBLIC' | 'REGISTERED_ONLY';
type ReactionType = 'like' | 'question' | 'insight';

interface CommentUser {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
}

interface ReactionSummary {
  like: number;
  question: number;
  insight: number;
  mine: string[];
}

interface ReplyData {
  id: string;
  content: string;
  visibility: Visibility;
  isDeleted: boolean;
  isVerified: boolean;
  editedAt: string | null;
  createdAt: string;
  user: CommentUser | null;
  reactions: ReactionSummary;
}

interface CommentData extends ReplyData {
  replies: ReplyData[];
}

interface CurrentUser {
  id: string;
  name: string | null;
  email: string;
}

interface Props {
  modelId: string;
  currentUser: CurrentUser | null;
  isModelOwner?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(user: CommentUser | null): string {
  if (!user) return '?';
  const name = user.name ?? user.email;
  return name.slice(0, 2).toUpperCase();
}

function getUserDisplayName(user: CommentUser | null): string {
  if (!user) return '[đã xóa]';
  return user.name ?? user.email.split('@')[0];
}

function formatRelativeDate(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Avatar({ user }: { user: CommentUser | null }) {
  const [imgError, setImgError] = useState(false);
  if (user?.avatar && !imgError) {
    return (
      <img
        src={user.avatar}
        alt=""
        className="w-7 h-7 rounded-full object-cover shrink-0"
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-semibold shrink-0 select-none">
      {getInitials(user)}
    </div>
  );
}

function VisibilityToggle({
  value,
  onChange,
}: {
  value: Visibility;
  onChange: (v: Visibility) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange('REGISTERED_ONLY')}
        title="Chỉ thành viên đã đăng ký mới thấy"
        className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs transition-colors ${
          value === 'REGISTERED_ONLY'
            ? 'bg-amber-50 border-amber-300 text-amber-700'
            : 'border-gray-200 text-gray-400 hover:border-gray-300'
        }`}
      >
        🔒 Thành viên
      </button>
      <button
        type="button"
        onClick={() => onChange('PUBLIC')}
        title="Tất cả mọi người đều thấy"
        className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs transition-colors ${
          value === 'PUBLIC'
            ? 'bg-blue-50 border-blue-300 text-blue-700'
            : 'border-gray-200 text-gray-400 hover:border-gray-300'
        }`}
      >
        🌐 Công khai
      </button>
    </div>
  );
}

// '|' marks the cursor position after insertion
const MATH_SNIPPETS = [
  { label: '$·$',   title: 'Inline math',  snippet: '$|$' },
  { label: '$$·$$', title: 'Display math', snippet: '\n$$\n|\n$$\n' },
  { label: 'a/b',   title: 'Phân số',      snippet: '\\frac{|a}{b}' },
  { label: '√',     title: 'Căn bậc hai',  snippet: '\\sqrt{|}' },
  { label: 'ⁿ√',   title: 'Căn bậc n',    snippet: '\\sqrt[n]{|}' },
  { label: 'Σ',     title: 'Tổng',         snippet: '\\sum_{i=1}^{n}' },
  { label: '∫',     title: 'Tích phân',    snippet: '\\int_{a}^{b}' },
  { label: '△',     title: 'Tam giác',     snippet: '\\triangle ' },
  { label: '∠',     title: 'Góc',          snippet: '\\angle ' },
  { label: '⊥',     title: 'Vuông góc',    snippet: '\\perp ' },
  { label: '∥',     title: 'Song song',    snippet: '\\parallel ' },
  { label: '≅',     title: 'Bằng nhau',    snippet: '\\cong ' },
  { label: 'α',     title: 'Alpha',        snippet: '\\alpha ' },
  { label: 'β',     title: 'Beta',         snippet: '\\beta ' },
  { label: 'γ',     title: 'Gamma',        snippet: '\\gamma ' },
  { label: 'θ',     title: 'Theta',        snippet: '\\theta ' },
  { label: 'π',     title: 'Pi',           snippet: '\\pi ' },
  { label: 'Δ',     title: 'Delta hoa',    snippet: '\\Delta ' },
];

function MathToolbar({ onInsert }: { onInsert: (snippet: string) => void }) {
  return (
    <div className="flex items-center gap-0.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
      {MATH_SNIPPETS.map((s) => (
        <button
          key={s.label}
          type="button"
          title={s.title}
          onClick={() => onInsert(s.snippet)}
          className="shrink-0 px-1.5 py-0.5 text-xs border border-gray-200 rounded hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors font-mono"
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

function CommentInput({
  value,
  onChange,
  placeholder,
  disabled,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertAtCursor = useCallback(
    (rawSnippet: string) => {
      const el = textareaRef.current;
      const markerIdx = rawSnippet.indexOf('|');
      const snippet = rawSnippet.replace('|', '');
      const cursorOffset = markerIdx === -1 ? snippet.length : markerIdx;

      if (!el) {
        onChange(value + snippet);
        return;
      }
      const start = el.selectionStart ?? value.length;
      const end = el.selectionEnd ?? value.length;
      const next = value.slice(0, start) + snippet + value.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + cursorOffset;
        el.focus();
      });
    },
    [value, onChange],
  );

  return (
    <div className="rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-400 focus-within:border-indigo-400">
      {/* Tab bar */}
      <div className="flex items-center border-b border-gray-200 bg-gray-50 px-1.5 pt-1 gap-1">
        <button
          type="button"
          onClick={() => setShowPreview(false)}
          className={`px-2 py-0.5 text-xs rounded-t transition-colors ${
            !showPreview
              ? 'bg-white border border-b-white border-gray-200 text-gray-700 font-medium -mb-px'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          ✏ Soạn thảo
        </button>
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className={`px-2 py-0.5 text-xs rounded-t transition-colors ${
            showPreview
              ? 'bg-white border border-b-white border-gray-200 text-gray-700 font-medium -mb-px'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          👁 Xem trước
        </button>
        <span className="ml-auto text-[10px] text-gray-400 pr-1 shrink-0">$LaTeX$ được hỗ trợ</span>
      </div>

      {showPreview ? (
        <div className="min-h-[4rem] p-2.5 text-sm text-gray-700">
          {value.trim() ? (
            <LatexRenderer className="break-words">{value}</LatexRenderer>
          ) : (
            <span className="italic text-gray-400">Chưa có nội dung…</span>
          )}
        </div>
      ) : (
        <>
          <div className="px-2 pt-1.5 pb-1 border-b border-gray-100 bg-gray-50">
            <MathToolbar onInsert={insertAtCursor} />
          </div>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full text-sm p-2.5 focus:outline-none resize-none disabled:opacity-60 bg-white"
          />
        </>
      )}
    </div>
  );
}

const REACTION_DEFS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'like',     emoji: '👍', label: 'Thích' },
  { type: 'question', emoji: '❓', label: 'Thắc mắc' },
  { type: 'insight',  emoji: '💡', label: 'Hay' },
];

function ReactionBar({
  reactions,
  disabled,
  onToggle,
}: {
  reactions: ReactionSummary;
  disabled: boolean;
  onToggle: (type: ReactionType) => void;
}) {
  return (
    <div className="flex items-center gap-1 mt-1.5">
      {REACTION_DEFS.map(({ type, emoji, label }) => {
        const count = reactions[type];
        const isMine = reactions.mine.includes(type);
        return (
          <button
            key={type}
            type="button"
            title={disabled ? 'Đăng nhập để react' : label}
            disabled={disabled}
            onClick={() => onToggle(type)}
            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors disabled:cursor-default ${
              isMine
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 disabled:hover:bg-transparent disabled:hover:border-gray-200'
            }`}
          >
            <span>{emoji}</span>
            {count > 0 && <span>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CommentsSection({ modelId, currentUser, isModelOwner = false }: Props) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [posting, setPosting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('REGISTERED_ONLY');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyVisibility, setReplyVisibility] = useState<Visibility>('REGISTERED_ONLY');
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [editPosting, setEditPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Data fetching ───────────────────────────────────────────────────────────

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/models/${modelId}/comments?limit=20`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments ?? []);
        setNextCursor(data.nextCursor ?? null);
        setHiddenCount(data.hiddenCount ?? 0);
      }
    } catch {
      // network error — leave previous state
    } finally {
      setLoading(false);
    }
  }, [modelId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/models/${modelId}/comments?cursor=${nextCursor}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [...prev, ...(data.comments ?? [])]);
        setNextCursor(data.nextCursor ?? null);
      }
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  };

  // ── Mutations ───────────────────────────────────────────────────────────────

  const postComment = async (content: string, vis: Visibility, parentId?: string) => {
    setPosting(true);
    setError(null);
    try {
      const res = await fetch(`/api/models/${modelId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, visibility: vis, parentId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Không thể đăng bình luận');
        return;
      }
      if (parentId) {
        setReplyText('');
        setReplyingTo(null);
        setReplyVisibility('REGISTERED_ONLY');
      } else {
        setCommentText('');
        setVisibility('REGISTERED_ONLY');
      }
      await fetchComments();
    } catch {
      setError('Lỗi kết nối, vui lòng thử lại');
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Xóa bình luận này?')) return;
    try {
      await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
      await fetchComments();
    } catch {
      // ignore
    }
  };

  const handleEdit = async () => {
    if (!editing) return;
    setEditPosting(true);
    try {
      const res = await fetch(`/api/comments/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editing.text.trim() }),
      });
      if (res.ok) {
        const { comment: updated } = await res.json();
        setComments((prev) =>
          prev.map((c) => {
            if (c.id === editing.id) {
              return { ...c, content: updated.content, editedAt: updated.editedAt };
            }
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === editing.id
                  ? { ...r, content: updated.content, editedAt: updated.editedAt }
                  : r,
              ),
            };
          }),
        );
        setEditing(null);
      } else {
        const data = await res.json();
        setError(data.error ?? 'Không thể lưu chỉnh sửa');
      }
    } catch {
      setError('Lỗi kết nối, vui lòng thử lại');
    } finally {
      setEditPosting(false);
    }
  };

  const handleVerify = async (commentId: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}/verify`, { method: 'POST' });
      if (res.ok) {
        const { isVerified } = await res.json();
        setComments((prev) =>
          prev.map((c) => {
            if (c.id === commentId) return { ...c, isVerified };
            return {
              ...c,
              replies: c.replies.map((r) => (r.id === commentId ? { ...r, isVerified } : r)),
            };
          }),
        );
      }
    } catch {
      // ignore
    }
  };

  const handleReaction = async (commentId: string, type: ReactionType) => {
    if (!currentUser) return;
    // Optimistic update
    const applyToggle = (item: ReplyData | CommentData): ReplyData | CommentData => {
      if (item.id !== commentId) return item;
      const isMine = item.reactions.mine.includes(type);
      return {
        ...item,
        reactions: {
          ...item.reactions,
          [type]: isMine ? item.reactions[type] - 1 : item.reactions[type] + 1,
          mine: isMine
            ? item.reactions.mine.filter((t) => t !== type)
            : [...item.reactions.mine, type],
        },
      };
    };
    setComments((prev) =>
      prev.map((c) => {
        const updated = applyToggle(c) as CommentData;
        return { ...updated, replies: c.replies.map((r) => applyToggle(r) as ReplyData) };
      }),
    );
    try {
      await fetch(`/api/comments/${commentId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
    } catch {
      // Revert by refetching on error
      await fetchComments();
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const totalCount = comments.reduce((acc, c) => acc + 1 + (c.replies?.length ?? 0), 0);

  const renderCommentItem = (item: CommentData | ReplyData, isReply = false) => {
    const isOwn = currentUser != null && item.user?.id === currentUser.id;
    const isReplying = !isReply && replyingTo === item.id;
    const isEditing = editing?.id === item.id;

    return (
      <div key={item.id} className={isReply ? 'mt-2 ml-8' : ''}>
        <div
          className={`p-3 rounded-lg ${
            isReply ? 'bg-gray-50' : 'bg-white border border-gray-100 shadow-sm'
          } ${item.isVerified ? 'border-l-2 border-l-green-400' : ''}`}
        >
          {/* Header row */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <Avatar user={item.user} />
              <span className="text-sm font-medium text-gray-700 truncate">
                {getUserDisplayName(item.user)}
              </span>
              <span className="text-xs text-gray-400 shrink-0">
                {formatRelativeDate(item.createdAt)}
              </span>
              {item.editedAt && !item.isDeleted && (
                <span className="text-xs text-gray-400 shrink-0 italic">(đã sửa)</span>
              )}
              {item.visibility === 'REGISTERED_ONLY' && !item.isDeleted && (
                <span className="text-xs shrink-0" title="Chỉ thành viên đã đăng ký mới thấy">
                  🔒
                </span>
              )}
              {item.isVerified && !item.isDeleted && (
                <span
                  className="text-xs shrink-0 text-green-600 font-medium"
                  title="Câu trả lời được xác nhận"
                >
                  ✔ Xác nhận
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {isModelOwner && !isReply && !item.isDeleted && (
                <button
                  onClick={() => handleVerify(item.id)}
                  title={item.isVerified ? 'Bỏ xác nhận' : 'Đánh dấu câu trả lời đúng'}
                  className={`text-xs transition-colors ${
                    item.isVerified
                      ? 'text-green-600 hover:text-green-800'
                      : 'text-gray-400 hover:text-green-600'
                  }`}
                >
                  ✔
                </button>
              )}
              {isOwn && !item.isDeleted && !isEditing && (
                <button
                  onClick={() => setEditing({ id: item.id, text: item.content })}
                  className="text-xs text-gray-400 hover:text-indigo-600 transition-colors"
                  title="Chỉnh sửa (trong vòng 15 phút)"
                >
                  ✏
                </button>
              )}
              {!isReply && currentUser && !item.isDeleted && (
                <button
                  onClick={() => {
                    setReplyingTo(isReplying ? null : item.id);
                    setReplyText('');
                    setReplyVisibility('REGISTERED_ONLY');
                  }}
                  className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
                >
                  Trả lời
                </button>
              )}
              {isOwn && !item.isDeleted && (
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  Xóa
                </button>
              )}
            </div>
          </div>

          {/* Content or edit form */}
          {item.isDeleted ? (
            <p className="text-sm text-gray-400 italic">[đã xóa]</p>
          ) : isEditing ? (
            <div className="mt-1">
              <CommentInput
                value={editing.text}
                onChange={(v) => setEditing({ id: editing.id, text: v })}
                placeholder="Chỉnh sửa bình luận…"
                disabled={editPosting}
                rows={3}
              />
              <div className="flex items-center justify-end gap-2 mt-1.5">
                <button
                  onClick={() => setEditing(null)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Hủy
                </button>
                <button
                  onClick={handleEdit}
                  disabled={!editing.text.trim() || editPosting}
                  className="text-xs bg-indigo-600 text-white rounded px-3 py-1 disabled:opacity-50 hover:bg-indigo-700 transition-colors"
                >
                  {editPosting ? 'Đang lưu…' : 'Lưu'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-700">
              <LatexRenderer className="break-words">{item.content}</LatexRenderer>
            </div>
          )}

          {/* Reactions */}
          {!item.isDeleted && !isEditing && (
            <ReactionBar
              reactions={item.reactions}
              disabled={!currentUser}
              onToggle={(type) => handleReaction(item.id, type)}
            />
          )}
        </div>

        {/* Inline reply form */}
        {isReplying && currentUser && (
          <div className="mt-2 ml-8">
            <CommentInput
              value={replyText}
              onChange={setReplyText}
              placeholder="Viết phản hồi… (hỗ trợ $LaTeX$)"
              disabled={posting}
              rows={2}
            />
            <div className="flex items-center justify-between mt-1.5">
              <VisibilityToggle value={replyVisibility} onChange={setReplyVisibility} />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyText('');
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Hủy
                </button>
                <button
                  onClick={() => postComment(replyText.trim(), replyVisibility, item.id)}
                  disabled={!replyText.trim() || posting}
                  className="text-xs bg-indigo-600 text-white rounded px-3 py-1 disabled:opacity-50 hover:bg-indigo-700 transition-colors"
                >
                  Gửi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Replies */}
        {!isReply &&
          (item as CommentData).replies?.map((reply) => renderCommentItem(reply, true))}
      </div>
    );
  };

  return (
    <div className="mt-6 pt-5 border-t border-gray-100">
      <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-3">
        💬 Bình luận{!loading && totalCount > 0 ? ` (${totalCount})` : ''}
      </h2>

      {/* New comment form */}
      {currentUser ? (
        <div className="mb-4">
          <CommentInput
            value={commentText}
            onChange={setCommentText}
            placeholder="Viết bình luận của bạn… (hỗ trợ $LaTeX$)"
            disabled={posting}
            rows={3}
          />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          <div className="flex items-center justify-between mt-2">
            <VisibilityToggle value={visibility} onChange={setVisibility} />
            <button
              onClick={() => postComment(commentText.trim(), visibility)}
              disabled={!commentText.trim() || posting}
              className="text-sm bg-indigo-600 text-white rounded-lg px-4 py-1.5 disabled:opacity-50 hover:bg-indigo-700 transition-colors"
            >
              {posting ? 'Đang gửi…' : 'Đăng'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4 p-3 bg-indigo-50 rounded-lg text-sm text-center text-indigo-700">
          <a href="/login" className="font-medium underline hover:text-indigo-900">
            Đăng nhập
          </a>{' '}
          để bình luận về mô hình này.
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-white border border-gray-100 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-gray-200" />
                <div className="h-3 bg-gray-200 rounded w-24" />
              </div>
              <div className="h-3 bg-gray-100 rounded w-full mb-1" />
              <div className="h-3 bg-gray-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">
          {hiddenCount > 0 ? (
            <>
              Có {hiddenCount} bình luận chỉ dành cho thành viên đã đăng nhập.{' '}
              <a href="/login" className="text-indigo-600 underline hover:text-indigo-800">
                Đăng nhập
              </a>{' '}
              để xem.
            </>
          ) : (
            'Chưa có bình luận nào. Hãy là người đầu tiên!'
          )}
        </p>
      ) : (
        <>
          <div className="space-y-3">
            {comments.map((c) => renderCommentItem(c))}
          </div>
          {nextCursor && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="mt-3 w-full text-xs text-indigo-600 hover:text-indigo-800 py-2 border border-indigo-200 rounded-lg hover:bg-indigo-50 disabled:opacity-50 transition-colors"
            >
              {loadingMore ? 'Đang tải…' : 'Tải thêm bình luận'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

