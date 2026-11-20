// Dev helper: how many households / sync records are in the local SQLite database?
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
console.log("households", await p.household.count(), "syncRecords", await p.syncRecord.count(), "members", await p.member.count());
await p.$disconnect();
