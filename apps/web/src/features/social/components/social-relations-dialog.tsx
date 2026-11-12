import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, UserCheck, UserPlus, X } from "lucide-react";
import type { SocialRelationItemDto } from "@starter/shared/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useFollowUser,
  useUnfollowUser,
  useUserFollowers,
  useUserFollowing,
} from "../hooks";

type SocialRelationsDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  targetUsername: string;
  initialTab?: "followers" | "following";
  currentUserId?: string;
};

export function SocialRelationsDialog({
  isOpen,
  onClose,
  targetUsername,
  initialTab = "followers",
  currentUserId,
}: SocialRelationsDialogProps) {
  const [activeTab, setActiveTab] = useState<"followers" | "following">(
    initialTab,
  );
  const [searchQuery, setSearchQuery] = useState("");

  const { data: followers = [], isLoading: isLoadingFollowers } =
    useUserFollowers(isOpen ? targetUsername : "");
  const { data: following = [], isLoading: isLoadingFollowing } =
    useUserFollowing(isOpen ? targetUsername : "");

  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();

  if (!isOpen) return null;

  const currentList = activeTab === "followers" ? followers : following;
  const isLoading =
    activeTab === "followers" ? isLoadingFollowers : isLoadingFollowing;

  const filteredList = currentList.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      (item.username && item.username.toLowerCase().includes(q)) ||
      (item.bio && item.bio.toLowerCase().includes(q))
    );
  });

  const handleToggleFollow = async (item: SocialRelationItemDto) => {
    if (item.type !== "user" && item.type !== "author") {
      return;
    }
    if (item.isFollowing) {
      await unfollowMutation.mutateAsync(item.id);
    } else {
      await followMutation.mutateAsync({
        targetUserId: item.id,
        isSubscribedUpdates: true,
      });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 text-foreground"
    >
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Tabs (Substack Aesthetic) */}
        <div className="border-b border-border px-4 pt-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setActiveTab("followers")}
              className={`pb-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 cursor-pointer ${
                activeTab === "followers"
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Pengikut ({followers.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("following")}
              className={`pb-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 cursor-pointer ${
                activeTab === "following"
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Mengikuti ({following.length})
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer mb-2"
            aria-label="Tutup"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-border/60 bg-muted/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari akun..."
              className="pl-8 text-xs h-9 rounded-lg bg-background"
            />
          </div>
        </div>

        {/* List Content */}
        <div className="max-h-96 overflow-y-auto divide-y divide-border/50">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground font-mono animate-pulse">
              Memuat relasi sosial...
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-12 px-6 text-center text-xs text-muted-foreground">
              {searchQuery.trim()
                ? "Tidak ada akun yang sesuai dengan pencarian."
                : activeTab === "followers"
                ? "Belum ada pengikut."
                : "Belum mengikuti akun atau komunitas apapun."}
            </div>
          ) : (
            filteredList.map((item) => {
              const isSelf = currentUserId && item.id === currentUserId;
              const avatarLetter = item.name.slice(0, 1).toUpperCase();

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors"
                >
                  <Link
                    to={item.href}
                    onClick={onClose}
                    className="flex items-center gap-3 min-w-0 flex-1 group"
                  >
                    <div className="size-10 rounded-full bg-zinc-800 border border-border text-foreground flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <span>{avatarLetter}</span>
                      )}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-serif font-bold text-xs sm:text-sm text-foreground group-hover:underline truncate">
                          {item.name}
                        </span>
                        {item.role && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border/80">
                            {item.role}
                          </span>
                        )}
                      </div>

                      {item.username && (
                        <p className="text-[11px] font-mono text-muted-foreground truncate">
                          @{item.username}
                        </p>
                      )}

                      {item.bio && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {item.bio}
                        </p>
                      )}
                    </div>
                  </Link>

                  {!isSelf && (item.type === "user" || item.type === "author") && (
                    <Button
                      type="button"
                      size="sm"
                      variant={item.isFollowing ? "outline" : "default"}
                      disabled={
                        followMutation.isPending || unfollowMutation.isPending
                      }
                      onClick={() => handleToggleFollow(item)}
                      className={`h-8 px-3 text-xs font-semibold rounded-lg shrink-0 ${
                        item.isFollowing
                          ? "border-border text-foreground hover:bg-muted"
                          : "bg-foreground text-background hover:opacity-90"
                      }`}
                    >
                      {item.isFollowing ? (
                        <>
                          <UserCheck className="size-3.5 mr-1" />
                          <span>Mengikuti</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="size-3.5 mr-1" />
                          <span>Ikuti</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
