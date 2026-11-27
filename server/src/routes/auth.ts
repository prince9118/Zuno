import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { signToken } from "../auth";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

const registerSchema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase()),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase()),
  password: z.string().min(1),
});

const publicUser = (u: { id: string; email: string; name: string | null }) => ({
  id: u.id,
  email: u.email,
  name: u.name,
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }
  const { email, password, name } = parsed.data;

  if (await prisma.user.findUnique({ where: { email } })) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const passwordHash = await Bun.password.hash(password);
  const user = await prisma.user.create({ data: { email, name, passwordHash } });
  res.status(201).json({ user: publicUser(user), token: await signToken(user.id) });
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await Bun.password.verify(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  res.json({ user: publicUser(user), token: await signToken(user.id) });
});

router.get("/me", requireAuth, async (_req, res) => {
  const user = await prisma.user.findUnique({ where: { id: res.locals.userId } });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: publicUser(user) });
});

export default router;
