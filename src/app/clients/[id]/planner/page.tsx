"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PostEditorDrawer } from "@/components/post-editor-drawer";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
} from "date-fns";
import { cn } from "@/lib/utils";

type Post = {
  id: string;
  postDate: string;
  assetId: string | null;
  caption: string | null;
  approvalSendAt: string | null;
  offsetDays: number;
  status: string;
  asset?: { id: string; url: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SCHEDULED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  CONFIRMED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  SKIPPED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  PENDING_APPROVAL: "bg-muted",
  CHANGES_REQUESTED: "bg-muted",
};

function PlannerContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const clientId = params.id as string;

  const monthParam = searchParams.get("month");
  const [viewDate, setViewDate] = useState(() => {
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [y, m] = monthParam.split("-").map(Number);
      return new Date(y, m - 1);
    }
    return new Date();
  });

  const [posts, setPosts] = useState<Post[]>([]);
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const monthStr = format(viewDate, "yyyy-MM");

  useEffect(() => {
    fetch(`/api/clients/${clientId}`)
      .then((r) => r.json())
      .then((c) => setClientName(c.name ?? "Client"));
  }, [clientId]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/clients/${clientId}/posts?month=${monthStr}`)
      .then((r) => r.json())
      .then(setPosts)
      .finally(() => setLoading(false));
  }, [clientId, monthStr]);

  const prevMonth = () => setViewDate((d) => subMonths(d, 1));
  const nextMonth = () => setViewDate((d) => addMonths(d, 1));

  const start = startOfMonth(viewDate);
  const end = endOfMonth(viewDate);
  const days = eachDayOfInterval({ start, end });

  // Pad start so first day aligns to correct weekday
  const startPad = start.getDay();
  const paddedDays = [...Array(startPad).fill(null), ...days];

  const getPostsForDay = (day: Date) =>
    posts.filter((p) => isSameDay(parseISO(p.postDate), day));

  const openEditor = (post: Post) => {
    setSelectedPost(post);
    setDrawerOpen(true);
  };

  const createPostForDay = (day: Date) => {
    fetch(`/api/clients/${clientId}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postDate: format(day, "yyyy-MM-dd"),
        status: "DRAFT",
        offsetDays: 0,
      }),
    })
      .then((r) => r.json())
      .then((post) => {
        setPosts((prev) => [...prev, post].sort((a, b) => a.postDate.localeCompare(b.postDate)));
        setSelectedPost(post);
        setDrawerOpen(true);
      });
  };

  const deletePost = (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    if (!confirm("Delete this post?")) return;
    fetch(`/api/clients/${clientId}/posts/${postId}`, { method: "DELETE" }).then((r) => {
      if (r.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        if (selectedPost?.id === postId) {
          setSelectedPost(null);
          setDrawerOpen(false);
        }
      }
    });
  };

  const refreshPosts = () => {
    fetch(`/api/clients/${clientId}/posts?month=${monthStr}`)
      .then((r) => r.json())
      .then(setPosts);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{clientName}</h1>
            <p className="text-sm text-muted-foreground">
              Click a day to add a post, click a post to edit, use ⋮ to delete
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[140px] text-center font-medium">
            {format(viewDate, "MMMM yyyy")}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="rounded-lg border">
          <div className="grid grid-cols-7 border-b bg-muted/50">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                className="p-2 text-center text-sm font-medium text-muted-foreground"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {paddedDays.map((day, i) => {
              if (!day) {
                return <div key={`pad-${i}`} className="min-h-[120px] border p-2" />;
              }
              const dayPosts = getPostsForDay(day);
              const isCurrentMonth = isSameMonth(day, viewDate);

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "min-h-[120px] border p-2 transition-colors",
                    !isCurrentMonth && "bg-muted/30"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "text-sm font-medium",
                        !isCurrentMonth && "text-muted-foreground"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        createPostForDay(day);
                      }}
                      title="Add post"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="mt-1.5 space-y-1.5">
                    {dayPosts.map((post) => (
                      <div
                        key={post.id}
                        className="group flex cursor-pointer items-start gap-1 rounded border bg-background p-1.5 transition-colors hover:bg-muted/50"
                        onClick={() => openEditor(post)}
                      >
                        <div className="min-w-0 flex-1">
                          {post.asset?.id && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`/api/asset/${post.asset.id}`}
                              alt=""
                              className="h-10 w-full rounded object-cover"
                            />
                          )}
                          <Badge
                            variant="secondary"
                            className={cn("mt-0.5 text-xs", STATUS_COLORS[post.status] ?? "")}
                          >
                            {post.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 opacity-70 hover:opacity-100 hover:text-destructive"
                          onClick={(e) => deletePost(e, post.id)}
                          title="Delete post"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <PostEditorDrawer
        post={selectedPost}
        clientId={clientId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onSaved={refreshPosts}
        onDeleted={refreshPosts}
      />
    </div>
  );
}

export default function PlannerPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
      <PlannerContent />
    </Suspense>
  );
}
