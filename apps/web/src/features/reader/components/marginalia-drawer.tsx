import { useState } from "react";
import {
  Eye,
  EyeOff,
  Loader2,
  MessageSquare,
  Send,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useChapterComments, useCreateComment } from "@/features/books/hooks";

type MarginaliaDrawerProps = {
  slug: string;
  chapterId: string;
  paragraphIndex: number;
  isOpen: boolean;
  onClose: () => void;
};

export function MarginaliaDrawer({
  slug,
  chapterId,
  paragraphIndex,
  isOpen,
  onClose,
}: MarginaliaDrawerProps) {
  const [content, setContent] = useState("");
  const [revealedCommentIds, setRevealedCommentIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: comments = [], isLoading } = useChapterComments(slug, chapterId);
  const createCommentMutation = useCreateComment(slug);

  const paragraphComments = comments.filter(
    (c) => c.paragraphIndex === paragraphIndex,
  );

  const toggleReveal = (id: string) => {
    setRevealedCommentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim().length < 2) {
      setErrorMessage("Catatan marjinalia minimal 2 karakter.");
      return;
    }
    setErrorMessage(null);

    try {
      await createCommentMutation.mutateAsync({
        chapterId,
        paragraphIndex,
        content: content.trim(),
      });
      setContent("");
    } catch (err: unknown) {
      const error = err as { message?: string };
      setErrorMessage(
        error?.message || "Gagal mengirim catatan. Pastikan Anda sudah masuk.",
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="marginalia-title"
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-[var(--color-accent)]" />
          <div>
            <h2 id="marginalia-title" className="font-serif text-sm font-bold text-foreground">
              Marjinalia Paragraf {paragraphIndex + 1}
            </h2>
            <p className="text-[10px] font-mono text-muted-foreground">
              Catatan tepi dari sesama pembaca
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-[4px] text-muted-foreground hover:text-foreground hover:bg-muted/50"
          aria-label="Tutup Panel Marjinalia"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Comment List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin mb-2" />
            <p className="text-xs font-mono">Memuat catatan marjinalia...</p>
          </div>
        ) : paragraphComments.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <p className="font-serif text-sm text-foreground">
              Belum ada catatan tepi di paragraf ini.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Tulis impresi atau anotasi pertama Anda untuk memperkaya pemahaman bersama.
            </p>
          </div>
        ) : (
          paragraphComments.map((comment) => {
            const isLong = comment.content.length > 200;
            const isRevealed = revealedCommentIds.includes(comment.id);

            return (
              <div
                key={comment.id}
                className="p-3 rounded-[6px] bg-background border border-border/70 space-y-1.5"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-foreground font-sans">
                    {comment.userName}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {new Date(comment.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>

                <div className="relative">
                  <p
                    className={`text-xs font-sans text-foreground/90 leading-relaxed transition-all ${
                      isLong && !isRevealed ? "line-clamp-3 blur-[2px] select-none" : ""
                    }`}
                  >
                    {comment.content}
                  </p>

                  {isLong && !isRevealed && (
                    <button
                      type="button"
                      onClick={() => toggleReveal(comment.id)}
                      className="mt-1 text-[11px] font-mono text-[var(--color-accent)] flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Eye className="size-3" />
                      <span>Buka Catatan Lengkap</span>
                    </button>
                  )}

                  {isLong && isRevealed && (
                    <button
                      type="button"
                      onClick={() => toggleReveal(comment.id)}
                      className="mt-1 text-[11px] font-mono text-muted-foreground flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <EyeOff className="size-3" />
                      <span>Ciutkan</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Submission Form */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-muted/20 space-y-2">
        <Textarea
          rows={2}
          placeholder="Tulis catatan atau pertanyaan Anda pada paragraf ini..."
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            if (errorMessage) setErrorMessage(null);
          }}
          className="text-xs font-sans resize-none"
        />

        {errorMessage && (
          <p className="text-[11px] text-destructive font-mono">{errorMessage}</p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-muted-foreground">
            Bebas spoiler naskah
          </span>
          <Button
            type="submit"
            size="sm"
            disabled={createCommentMutation.isPending || !content.trim()}
            className="h-7 text-xs font-mono gap-1"
          >
            {createCommentMutation.isPending ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Send className="size-3" />
            )}
            <span>Simpan</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
