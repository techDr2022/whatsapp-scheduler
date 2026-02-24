"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { ArrowLeft, Plus, Star, Calendar, Trash2, Pencil } from "lucide-react";

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
  const router = useRouter();
  const id = params.id as string;
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState("");
  const [openContact, setOpenContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "", isPrimaryApproval: false });
  const [deleting, setDeleting] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editContactForm, setEditContactForm] = useState({ name: "", phone: "", isPrimaryApproval: false });

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

  const deleteClient = async () => {
    if (!client || !confirm(`Delete "${client.name}"? This will remove all contacts and scheduled posts.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) router.push("/clients");
  };

  const openEditContact = (c: Contact) => {
    setEditingContact(c);
    setEditContactForm({ name: c.name, phone: c.phone, isPrimaryApproval: c.isPrimaryApproval });
  };

  const saveEditContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact) return;
    const res = await fetch(`/api/clients/${id}/contacts/${editingContact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editContactForm),
    });
    if (res.ok) {
      const updated = await res.json();
      setClient((prev) =>
        prev
          ? {
              ...prev,
              contacts: prev.contacts.map((c) => (c.id === updated.id ? updated : c)),
            }
          : null
      );
      setEditingContact(null);
    }
  };

  const deleteContact = async (contactId: string, contactName: string) => {
    if (!confirm(`Remove contact "${contactName}"?`)) return;
    const res = await fetch(`/api/clients/${id}/contacts/${contactId}`, { method: "DELETE" });
    if (res.ok)
      setClient((prev) => (prev ? { ...prev, contacts: prev.contacts.filter((c) => c.id !== contactId) } : null));
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
                  <Label htmlFor="primary">Primary contact (receives WhatsApp)</Label>
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
                <div className="flex items-center gap-1">
                  {!c.isPrimaryApproval && (
                    <Button size="sm" variant="outline" onClick={() => setPrimary(c.id)}>
                      Set Primary
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => openEditContact(c)} title="Edit contact">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => deleteContact(c.id, c.name)}
                    title="Delete contact"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Dialog open={!!editingContact} onOpenChange={(open) => !open && setEditingContact(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Contact</DialogTitle>
              </DialogHeader>
              <form onSubmit={saveEditContact} className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={editContactForm.name}
                    onChange={(e) => setEditContactForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Contact name"
                    required
                  />
                </div>
                <div>
                  <Label>Phone (E.164)</Label>
                  <Input
                    value={editContactForm.phone}
                    onChange={(e) => setEditContactForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+15551234567"
                    required
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-primary"
                    checked={editContactForm.isPrimaryApproval}
                    onChange={(e) =>
                      setEditContactForm((p) => ({ ...p, isPrimaryApproval: e.target.checked }))
                    }
                  />
                  <Label htmlFor="edit-primary">Primary contact (receives WhatsApp)</Label>
                </div>
                <Button type="submit">Save</Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href={`/clients/${id}/planner`}>
            <Calendar className="mr-2 h-4 w-4" />
            Open Monthly Planner
          </Link>
        </Button>
        <Button
          variant="ghost"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={deleteClient}
          disabled={deleting}
          title="Delete client"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete client
        </Button>
      </div>
    </div>
  );
}
