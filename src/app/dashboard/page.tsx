"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  RefreshCw,
  Edit,
  Image as ImageIcon,
  CalendarPlus,
  Users,
  Play,
} from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { cn } from "@/lib/utils";

type Post = {
  id: string;
  postDate: string;
  caption: string | null;
  status: string;
  client: { id: string; name: string };
  asset?: { id: string; url: string } | null;
};

type Client = { id: string; name: string };

function DashboardContent() {
  const searchParams = useSearchParams();
  const monthParam = searchParams.get("month");
  const [viewDate, setViewDate] = useState(() => {
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [y, m] = monthParam.split("-").map(Number);
      return new Date(y, m - 1);
    }
    return new Date();
  });
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clients, setClients] = useState<Client[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const monthStr = format(viewDate, "yyyy-MM");

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data) => setClients(data));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ month: monthStr });
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (clientFilter !== "all") params.set("clientId", clientFilter);
    fetch(`/api/dashboard?${params}`)
      .then((r) => r.json())
      .then(setPosts)
      .finally(() => setLoading(false));
  }, [monthStr, statusFilter, clientFilter]);

  const prevMonth = () => setViewDate((d) => subMonths(d, 1));
  const nextMonth = () => setViewDate((d) => addMonths(d, 1));

  const sendNow = async (postId: string) => {
    const res = await fetch(`/api/posts/${postId}/resend`, { method: "POST" });
    if (res.ok) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, status: "CONFIRMED" } : p
        )
      );
    }
  };

  const runScheduler = async () => {
    setProcessing(true);
    try {
      const res = await fetch("/api/cron/scheduler");
      const data = await res.json();
      if (res.ok) {
        if (data.processed > 0 && data.successCount > 0) {
          const params = new URLSearchParams({ month: monthStr });
          if (statusFilter !== "all") params.set("status", statusFilter);
          if (clientFilter !== "all") params.set("clientId", clientFilter);
          fetch(`/api/dashboard?${params}`).then((r) => r.json()).then(setPosts);
        }
        const successCount = data.successCount ?? data.results?.filter((r: { success: boolean }) => r.success).length ?? 0;
        const failed = data.results?.filter((r: { success: boolean; error?: string }) => !r.success);
        let msg =
          data.processed > 0
            ? `Processed ${data.processed} post(s). ${successCount} sent. Check WhatsApp!`
            : "No pending posts to process.";
        if (failed?.length > 0) {
          msg += `\n\nFailed: ${failed.map((f: { error?: string }) => f.error).join(", ")}`;
        }
        alert(msg);
      } else {
        alert(data.error || "Failed to run scheduler");
      }
    } catch {
      alert("Failed to run scheduler");
    } finally {
      setProcessing(false);
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    SCHEDULED: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    CONFIRMED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    SKIPPED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };

  const selectedClientId = clientFilter === "all" ? null : clientFilter;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Manage and schedule WhatsApp posts across your clients
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All clients</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="CONFIRMED">Sent</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1 rounded-md border px-3 py-2">
                <Button variant="ghost" size="icon" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[130px] text-center text-sm font-medium">
                  {format(viewDate, "MMMM yyyy")}
                </span>
                <Button variant="ghost" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="lg"
                onClick={runScheduler}
                disabled={processing}
              >
                {processing ? (
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Process pending
              </Button>
              <Button asChild size="lg">
                <Link
                  href={
                    selectedClientId
                      ? `/clients/${selectedClientId}/planner?month=${monthStr}`
                      : clients[0]
                        ? `/clients/${clients[0].id}/planner?month=${monthStr}`
                        : "/clients"
                  }
                >
                  <CalendarPlus className="mr-2 h-4 w-4" />
                  Schedule post
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarPlus className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="font-semibold">No posts this month</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Select a client and schedule your first post
            </p>
            <Button asChild className="mt-4">
              <Link
                href={
                  clients[0]
                    ? `/clients/${clients[0].id}/planner?month=${monthStr}`
                    : "/clients"
                }
              >
                Schedule post
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Card key={post.id} className="overflow-hidden transition-shadow hover:shadow-md">
              <div className="flex">
                {post.asset?.id ? (
                  <div className="h-28 w-28 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/asset/${post.asset.id}`}
                      alt="Post"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-28 w-28 shrink-0 items-center justify-center bg-muted">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{post.client.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(post.postDate), "MMM d, yyyy")}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/clients/${post.client.id}/planner?month=${monthStr}`}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit post
                          </Link>
                        </DropdownMenuItem>
                        {post.status === "SCHEDULED" && (
                          <DropdownMenuItem onClick={() => sendNow(post.id)}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Send now
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {post.caption || "No caption"}
                  </p>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "mt-2 w-fit",
                      STATUS_COLORS[post.status] ?? "bg-muted"
                    )}
                  >
                    {post.status.replace("_", " ")}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
