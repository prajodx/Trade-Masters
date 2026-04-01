import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { signToken } from "../lib/jwt";

const router: IRouter = Router();

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

router.post("/auth/google", async (req, res) => {
  try {
    const { idToken, userInfo } = req.body as {
      idToken: string;
      userInfo: {
        id: string;
        email: string;
        name: string;
        picture?: string;
      };
    };

    if (!userInfo || !userInfo.id || !userInfo.email) {
      res.status(400).json({ error: "Invalid user info" });
      return;
    }

    const existingUsers = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.googleId, userInfo.id))
      .limit(1);

    let user = existingUsers[0];

    if (!user) {
      const newUsers = await db
        .insert(usersTable)
        .values({
          id: generateId(),
          googleId: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          avatar: userInfo.picture ?? null,
          balance: "100000",
        })
        .returning();
      user = newUsers[0];
    } else {
      const updated = await db
        .update(usersTable)
        .set({
          name: userInfo.name,
          avatar: userInfo.picture ?? null,
          updatedAt: new Date(),
        })
        .where(eq(usersTable.id, user.id))
        .returning();
      user = updated[0];
    }

    const token = signToken({ userId: user.id, email: user.email });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        balance: parseFloat(user.balance),
      },
    });
  } catch (err) {
    req.log.error({ err }, "Auth error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
