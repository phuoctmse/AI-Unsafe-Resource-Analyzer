import { PrismaClient } from "@prisma/client";

// Prisma Client should be a singleton per Node process.
export const prisma = new PrismaClient();
