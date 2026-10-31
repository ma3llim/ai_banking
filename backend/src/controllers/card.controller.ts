import { Router } from "express";
import { z } from "zod";
import { currentUser, requireAuth, resolveUserId } from "../middleware/auth";
import { createCard, getCard, listCards } from "../services/card.service";
import { idSchema } from "../validation";

export const cardRouter = Router();
cardRouter.use(requireAuth);

const createCardSchema = z.object({
    userId: idSchema.optional(),
    cardType: z.enum(["DEBIT", "CREDIT"]).default("DEBIT"),
});

cardRouter.post("/", async (req, res) => {
    const body = createCardSchema.parse(req.body);
    const userId = resolveUserId(currentUser(req), body.userId);
    res.status(201).json(await createCard(userId, body.cardType));
});

cardRouter.get("/", async (req, res) => {
    const { userId } = z.object({ userId: idSchema.optional() }).parse(req.query);
    res.json(await listCards(resolveUserId(currentUser(req), userId)));
});

cardRouter.get("/:id", async (req, res) => {
    const card = await getCard(idSchema.parse(req.params.id));
    resolveUserId(currentUser(req), card.userId);
    res.json(card);
});
