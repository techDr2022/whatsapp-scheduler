import "dotenv/config";
import { prisma } from "../src/lib/db";

async function main() {
  // Create one client with full month of posts
  const client = await prisma.client.upsert({
    where: { id: "seed-client-1" },
    create: {
      id: "seed-client-1",
      name: "Acme Coffee Shop",
    },
    update: {},
  });

  await prisma.contact.upsert({
    where: { id: "seed-contact-1" },
    create: {
      id: "seed-contact-1",
      clientId: client.id,
      name: "Jane Manager",
      phone: "+15551234567",
      isPrimaryApproval: true,
    },
    update: {},
  });

  // Create placeholder asset for demo
  const asset = await prisma.asset.upsert({
    where: { key: "seed/placeholder-poster.png" },
    create: {
      key: "seed/placeholder-poster.png",
      url: "https://placehold.co/400x400/1a1a2e/eee?text=Post",
      mimeType: "image/png",
      sizeBytes: 1024,
    },
    update: {},
  });

  // Delete existing seed posts for this client to allow re-seeding
  await prisma.scheduledPost.deleteMany({
    where: { clientId: client.id },
  });

  // Create full month of posts (Feb 2025 as example)
  const year = 2025;
  const month = 2;
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const postDate = new Date(year, month - 1, day);
    const approvalSendAt = new Date(year, month - 1, day);
    approvalSendAt.setHours(9, 0, 0, 0); // 9 AM approval time

    const status =
      day <= 7
        ? "CONFIRMED"
        : day <= 14
          ? "PENDING_APPROVAL"
          : day <= 21
            ? "SCHEDULED"
            : "DRAFT";

    await prisma.scheduledPost.create({
      data: {
        clientId: client.id,
        postDate,
        assetId: asset.id,
        caption: `Acme Coffee special for ${postDate.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
        })}! ☕`,
        approvalSendAt,
        offsetDays: 0,
        status,
        sentAt: day <= 7 ? new Date() : null,
        confirmedAt: day <= 7 ? new Date() : null,
      },
    });
  }

  console.log("Seed completed: 1 client, 1 contact, 1 asset, full month of posts");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
