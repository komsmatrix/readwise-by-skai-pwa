import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

// ─── Markdown renderer (no external dep) ──────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^---$/gm, '<hr/>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, s => `<ul>${s}</ul>`)
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/^(?!<[hul]|<hr)(.+)$/gm, '$1')
    .replace(/^<\/p><p>$/, '')
    .split('\n').join('<br/>');
}

export default function LessonScreen({ session, onBack }) {
  const [topics, setTopics]         = useState([]);
  const [selected, setSelected]     = useState(null);  // selected topic
  const [lessons, setLessons]       = useState([]);
  const [activeLessonId, setActive] = useState(null);
  const [progress, setProgress]     = useState({});    // lessonId → completed
  const [loading, setLoading]       = useState(true);
  const [view, setView]             = useState("list"); // "list" | "lesson"

  const customerId = session?.customerId;

  // ── Load topics ──────────────────────────────────────────────────────────────
  useEffect(() => {
    loadTopics();
  }, []);

  async function loadTopics() {
    setLoading(true);
    const { data } = await supabase
      .from("topics")
      .select("id, name, board_frequency, topic_weight, subject_id")
      .order("sort_order");
    setTopics(data || []);
    if (data?.length) setSelected(data[0]);
    setLoading(false);
  }

  // ── Load lessons for selected topic ──────────────────────────────────────────
  useEffect(() => {
    if (!selected) return;
    loadLessons(selected.id);
  }, [selected]);

  async function loadLessons(topicId) {
    setLoading(true);
    const { data: lessonData } = await supabase
      .from("lessons")
      .select("*")
      .eq("topic_id", topicId)
      .eq("is_active", true)
      .order("sort_order");

    setLessons(lessonData || []);

    // Load progress for this student
    if (customerId && lessonData?.length) {
      const ids = lessonData.map(l => l.id);
      const { data: prog } = await supabase
        .from("lesson_progress")
        .select("lesson_id, completed")
        .eq("customer_id", customerId)
        .in("lesson_id", ids);
      const map = {};
      (prog || []).forEach(p => { map[p.lesson_id] = p.completed; });
      setProgress(map);
    }
    setLoading(false);
  }

  // ── Mark lesson complete ──────────────────────────────────────────────────────
  async function markComplete(lessonId) {
    setProgress(p => ({ ...p, [lessonId]: true }));
    await supabase.from("lesson_progress").upsert({
      customer_id: customerId,
      lesson_id: lessonId,
      completed: true,
      completed_at: new Date().toISOString(),
    }, { onConflict: "customer_id,lesson_id" });
  }

  const activeLesson = lessons.find(l => l.id === activeLessonId);
  const completedCount = lessons.filter(l => progress[l.id]).length;

  // ─── Lesson Reader ────────────────────────────────────────────────────────────
  if (view === "lesson" && activeLesson) {
    return (
      <div style={styles.screen}>
        {/* Header */}
        <div style={styles.readerHeader}>
          <button style={styles.backBtn} onClick={() => setView("list")}>
            ← Back
          </button>
          <span style={styles.readerTopic}>{selected?.name}</span>
          {progress[activeLesson.id]
            ? <span style={styles.doneBadge}>✓ Done</span>
            : <button style={styles.doneBtn} onClick={() => markComplete(activeLesson.id)}>
                Mark Complete
              </button>
          }
        </div>

        {/* Board relevance banner */}
        {activeLesson.board_relevance && (
          <div style={styles.relevanceBanner}>
            📋 {activeLesson.board_relevance}
          </div>
        )}

        {/* Lesson title + meta */}
        <div style={styles.readerMeta}>
          <h1 style={styles.lessonTitle}>{activeLesson.title}</h1>
          <span style={styles.readTime}>⏱ ~{activeLesson.read_time_mins} min read</span>
        </div>

        {/* Content */}
        <div
          style={styles.lessonContent}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(activeLesson.content) }}
        />

        {/* Memory hook */}
        {activeLesson.memory_hook && (
          <div style={styles.memoryHook}>
            <div style={styles.memoryHookLabel}>🧠 Memory Hook</div>
            <pre style={styles.memoryHookText}>{activeLesson.memory_hook}</pre>
          </div>
        )}

        {/* Done button at bottom */}
        {!progress[activeLesson.id] && (
          <button style={styles.doneBtnBottom} onClick={() => {
            markComplete(activeLesson.id);
            setView("list");
          }}>
            ✓ Lesson Complete — Back to List
          </button>
        )}
      </div>
    );
  }

  // ─── Topic + Lesson List ──────────────────────────────────────────────────────
  return (
    <div style={styles.screen}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>← Home</button>
        <span style={styles.headerTitle}>Lessons</span>
      </div>

      {/* Topic tabs */}
      <div style={styles.topicScroll}>
        {topics.map(t => (
          <button
            key={t.id}
            style={{
              ...styles.topicTab,
              ...(selected?.id === t.id ? styles.topicTabActive : {})
            }}
            onClick={() => setSelected(t)}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* Selected topic info */}
      {selected && (
        <div style={styles.topicInfo}>
          <span style={styles.topicName}>{selected.name}</span>
          <div style={styles.topicMeta}>
            <span style={{
              ...styles.freqBadge,
              background: freqColor(selected.board_frequency)
            }}>
              {selected.board_frequency} frequency
            </span>
            {lessons.length > 0 && (
              <span style={styles.progressLabel}>
                {completedCount}/{lessons.length} lessons done
              </span>
            )}
          </div>
          {lessons.length > 0 && (
            <div style={styles.progressBar}>
              <div style={{
                ...styles.progressFill,
                width: `${(completedCount / lessons.length) * 100}%`
              }} />
            </div>
          )}
        </div>
      )}

      {/* Lesson list */}
      {loading ? (
        <div style={styles.empty}>Loading…</div>
      ) : lessons.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>📖</div>
          <div style={styles.emptyTitle}>No lessons yet</div>
          <div style={styles.emptySubtitle}>
            Lessons for {selected?.name} are being prepared.
          </div>
        </div>
      ) : (
        <div style={styles.lessonList}>
          {lessons.map((lesson, idx) => {
            const done = progress[lesson.id];
            return (
              <button
                key={lesson.id}
                style={{ ...styles.lessonCard, ...(done ? styles.lessonCardDone : {}) }}
                onClick={() => { setActive(lesson.id); setView("lesson"); }}
              >
                <div style={styles.lessonCardLeft}>
                  <div style={styles.lessonNum}>{done ? "✓" : idx + 1}</div>
                  <div>
                    <div style={styles.lessonCardTitle}>{lesson.title}</div>
                    <div style={styles.lessonCardMeta}>
                      ⏱ {lesson.read_time_mins} min
                      {lesson.memory_hook && " · 🧠 Memory hook"}
                    </div>
                  </div>
                </div>
                <span style={styles.lessonArrow}>›</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function freqColor(freq) {
  const map = {
    "Very High": "#ef4444",
    "High":      "#f97316",
    "Medium":    "#eab308",
    "Low":       "#6b7280",
  };
  return map[freq] || "#6b7280";
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  screen: {
    minHeight: "100vh",
    background: "#0f0f0f",
    color: "#f0ede6",
    fontFamily: "'Inter', sans-serif",
    paddingBottom: 80,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "16px 20px",
    borderBottom: "1px solid #1e1e1e",
  },
  readerHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "16px 20px",
    borderBottom: "1px solid #1e1e1e",
    position: "sticky",
    top: 0,
    background: "#0f0f0f",
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#f0ede6",
    flex: 1,
  },
  readerTopic: {
    fontSize: 13,
    color: "#888",
    flex: 1,
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "#c9a84c",
    fontSize: 14,
    cursor: "pointer",
    padding: "4px 0",
    fontWeight: 600,
  },
  topicScroll: {
    display: "flex",
    gap: 8,
    padding: "12px 20px",
    overflowX: "auto",
    borderBottom: "1px solid #1e1e1e",
  },
  topicTab: {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    color: "#888",
    borderRadius: 20,
    padding: "6px 14px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.15s",
  },
  topicTabActive: {
    background: "rgba(201,168,76,0.15)",
    border: "1px solid #c9a84c",
    color: "#c9a84c",
  },
  topicInfo: {
    padding: "16px 20px 12px",
    borderBottom: "1px solid #1e1e1e",
  },
  topicName: {
    fontSize: 18,
    fontWeight: 700,
    display: "block",
    marginBottom: 8,
  },
  topicMeta: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  freqBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: "#fff",
    borderRadius: 4,
    padding: "2px 8px",
  },
  progressLabel: {
    fontSize: 12,
    color: "#888",
  },
  progressBar: {
    height: 4,
    background: "#1e1e1e",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "#c9a84c",
    borderRadius: 2,
    transition: "width 0.3s",
  },
  lessonList: {
    padding: "12px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  lessonCard: {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: 12,
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
    textAlign: "left",
    transition: "border-color 0.15s",
    width: "100%",
  },
  lessonCardDone: {
    borderColor: "#c9a84c33",
    opacity: 0.7,
  },
  lessonCardLeft: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  lessonNum: {
    width: 28,
    height: 28,
    background: "#2a2a2a",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
    color: "#c9a84c",
    flexShrink: 0,
  },
  lessonCardTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#f0ede6",
    marginBottom: 3,
  },
  lessonCardMeta: {
    fontSize: 11,
    color: "#666",
  },
  lessonArrow: {
    fontSize: 20,
    color: "#444",
  },
  // Reader styles
  relevanceBanner: {
    background: "rgba(201,168,76,0.1)",
    border: "1px solid rgba(201,168,76,0.2)",
    borderRadius: 0,
    padding: "10px 20px",
    fontSize: 12,
    color: "#c9a84c",
    lineHeight: 1.5,
  },
  readerMeta: {
    padding: "20px 20px 0",
  },
  lessonTitle: {
    fontSize: 24,
    fontWeight: 800,
    color: "#f0ede6",
    marginBottom: 6,
    lineHeight: 1.3,
  },
  readTime: {
    fontSize: 12,
    color: "#666",
  },
  lessonContent: {
    padding: "20px",
    fontSize: 15,
    lineHeight: 1.8,
    color: "#d0cdc6",
  },
  memoryHook: {
    margin: "0 20px 20px",
    background: "rgba(201,168,76,0.08)",
    border: "1px solid rgba(201,168,76,0.25)",
    borderRadius: 12,
    padding: 16,
  },
  memoryHookLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: "#c9a84c",
    marginBottom: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  memoryHookText: {
    fontSize: 13,
    color: "#f0ede6",
    lineHeight: 1.8,
    whiteSpace: "pre-wrap",
    fontFamily: "'DM Mono', monospace",
    margin: 0,
  },
  doneBadge: {
    fontSize: 12,
    fontWeight: 700,
    color: "#22c55e",
    background: "rgba(34,197,94,0.1)",
    padding: "4px 10px",
    borderRadius: 20,
  },
  doneBtn: {
    fontSize: 12,
    fontWeight: 700,
    color: "#c9a84c",
    background: "rgba(201,168,76,0.1)",
    border: "1px solid rgba(201,168,76,0.3)",
    padding: "6px 14px",
    borderRadius: 20,
    cursor: "pointer",
  },
  doneBtnBottom: {
    display: "block",
    margin: "0 20px 20px",
    width: "calc(100% - 40px)",
    padding: "14px",
    background: "#c9a84c",
    color: "#0f0f0f",
    border: "none",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
    textAlign: "center",
  },
  empty: {
    padding: 40,
    textAlign: "center",
    color: "#666",
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#888",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#555",
  },
};
