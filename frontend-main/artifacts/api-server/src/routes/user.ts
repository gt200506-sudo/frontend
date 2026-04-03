import { Router } from "express";
import { z } from "zod/v4";

const router = Router();

const UpdateUserBody = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().optional(),
  password: z.string().min(8).max(128).optional(),
});

type UserProfile = { name: string; email: string; updatedAt: Date };
const profileStore = new Map<string, UserProfile>();

router.put("/user/update", async (req, res) => {
  const userId = (req as any).userId as string | null;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const { name, email } = parsed.data;
  const existing = profileStore.get(userId);
  const updated: UserProfile = {
    name,
    email: email ?? existing?.email ?? userId,
    updatedAt: new Date(),
  };
  profileStore.set(userId, updated);

  // Password handling is intentionally placeholder-only for now.
  return res.json({
    success: true,
    data: {
      name: updated.name,
      email: updated.email,
      emailVerificationPending: !!email && email !== userId,
      passwordUpdated: !!parsed.data.password,
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
});

export default router;
