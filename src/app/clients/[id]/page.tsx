"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, Plus, Star, Calendar } from "lucide-react";

type Contact = {
  id: string;
  name: string;
  phone: string;
  isPrimaryApproval: boolean;
};

type Client = {
  id: string;
  name: string;
  contacts: Contact[];
};

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState("");
  const [openContact, setOpenContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "", isPrimaryApproval: false });

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setClient(data);
        setEditName(data.name ?? "");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const updateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    if (res.ok) setClient((prev) => (prev ? { ...prev, name: editName } : null));
  };

  const addContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/clients/${id}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newContact),
    });
    if (res.ok) {
      const contact = await res.json();
      setClient((prev) =>
        prev ? { ...prev, contacts: [...prev.contacts, contact] } : null
      );
      setNewContact({ name: "", phone: "", isPrimaryApproval: false });
      setOpenContact(false);
    }
  };

  const setPrimary = async (contactId: string) => {
    const contacts = client?.contacts ?? [];
    const updated = contacts.map((c) => ({
      ...c,
      isPrimaryApproval: c.id === contactId,
    }));
    for (const c of updated) {
      await fetch(`/api/clients/${id}/contacts/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: c.name,
          phone: c.phone,
          isPrimaryApproval: c.id === contactId,
        }),
      });
    }
    setClient((prev) => (prev ? { ...prev, contacts: updated } : null));
  };

  if (loading || !client) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{client.name}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={updateClient} className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="mt-6">
              Save
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Contacts (Primary Approval)</CardTitle>
          <Dialog open={openContact} onOpenChange={setOpenContact}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Contact</DialogTitle>
              </DialogHeader>
              <form onSubmit={addContact} className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={newContact.name}
                    onChange={(e) => setNewContact((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Contact name"
                    required
                  />
                </div>
                <div>
                  <Label>Phone (E.164)</Label>
                  <Input
                    value={newContact.phone}
                    onChange={(e) => setNewContact((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+15551234567"
                    required
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="primary"
                    checked={newContact.isPrimaryApproval}
                    onChange={(e) =>
                      setNewContact((p) => ({ ...p, isPrimaryApproval: e.target.checked }))
                    }
                  />
                  <Label htmlFor="primary">Primary approval contact</Label>
                </div>
                <Button type="submit">Add</Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {client.contacts.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <span className="font-medium">{c.name}</span>
                  {c.isPrimaryApproval && (
                    <Star className="ml-2 inline h-4 w-4 fill-amber-400 text-amber-500" />
                  )}
                  <p className="text-sm text-muted-foreground">{c.phone}</p>
                </div>
                {!c.isPrimaryApproval && (
                  <Button size="sm" variant="outline" onClick={() => setPrimary(c.id)}>
                    Set Primary
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button asChild>
        <Link href={`/clients/${id}/planner`}>
          <Calendar className="mr-2 h-4 w-4" />
          Open Monthly Planner
        </Link>
      </Button>
    </div>
  );
}
