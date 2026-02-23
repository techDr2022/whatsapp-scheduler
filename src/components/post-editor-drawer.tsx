"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Loader2, Upload, Send } from "lucide-react";
import { format } from "date-fns";

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

type PostEditorDrawerProps = {
  post: Post | null;
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export function PostEditorDrawer({
  post,
  clientId,
  open,
  onOpenChange,
  onSaved,
}: PostEditorDrawerProps) {
  const [caption, setCaption] = useState(post?.caption ?? "");
  const [sendTime, setSendTime] = useState(
    post?.approvalSendAt
      ? format(new Date(post.approvalSendAt), "HH:mm")
      : "09:00"
  );
  const [offsetDays, setOffsetDays] = useState(post?.offsetDays ?? 0);
  const [assetId, setAssetId] = useState<string | null>(post?.assetId ?? null);
  const [assetUrl, setAssetUrl] = useState<string | null>(post?.asset?.url ?? null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const postDate = post ? new Date(post.postDate) : new Date();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("clientId", clientId);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const { asset, url } = await res.json();
      setAssetId(asset.id);
      setAssetUrl(url);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const saveDraft = async () => {
    if (!post) return;
    setSaving(true);
    try {
      const [h, m] = sendTime.split(":").map(Number);
      const approvalSendAt = new Date(postDate);
      approvalSendAt.setHours(h, m, 0, 0);

      const res = await fetch(`/api/clients/${clientId}/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: caption || null,
          approvalSendAt,
          offsetDays,
          assetId,
          status: "DRAFT",
        }),
      });
      if (res.ok) {
        onSaved();
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const saveSchedule = async () => {
    if (!post) return;
    setSaving(true);
    try {
      const [h, m] = sendTime.split(":").map(Number);
      const approvalSendAt = new Date(postDate);
      approvalSendAt.setHours(h, m, 0, 0);

      const res = await fetch(`/api/clients/${clientId}/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: caption || null,
          approvalSendAt,
          offsetDays,
          assetId,
          status: "SCHEDULED",
        }),
      });
      if (res.ok) {
        onSaved();
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const sendPostNow = async () => {
    if (!post) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/resend`, {
        method: "POST",
      });
      if (res.ok) {
        onSaved();
        onOpenChange(false);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to send");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!post) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            Edit Post — {format(postDate, "EEEE, MMM d, yyyy")}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div>
            <Label>Poster / Media</Label>
            <div className="mt-2 flex gap-4">
              {assetUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={assetUrl}
                  alt="Poster preview"
                  className="h-24 w-24 rounded object-cover"
                />
              )}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {assetUrl ? "Change" : "Upload"}
                </Button>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="caption">Caption</Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Post caption..."
              rows={4}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="sendTime">Send time</Label>
            <Input
              id="sendTime"
              type="time"
              value={sendTime}
              onChange={(e) => setSendTime(e.target.value)}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="offsetDays">Offset days (before post date)</Label>
            <Input
              id="offsetDays"
              type="number"
              min={0}
              value={offsetDays}
              onChange={(e) => setOffsetDays(parseInt(e.target.value, 10) || 0)}
              className="mt-2"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-4">
            <Button variant="outline" onClick={saveDraft} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Draft
            </Button>
            <Button onClick={saveSchedule} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Schedule
            </Button>
            <Button
              variant="secondary"
              onClick={sendPostNow}
              disabled={saving}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send now
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
