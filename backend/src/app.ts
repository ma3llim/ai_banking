import express from "express";
import cors from "cors";
import { config } from "./config";
import { authRouter } from "./controllers/auth.controller";
import { userRouter } from "./controllers/user.controller";
import { cardRouter } from "./controllers/card.controller";
import { transactionRouter } from "./controllers/transaction.controller";
import { transferRouter } from "./controllers/transfer.controller";
import { documentRouter } from "./controllers/document.controller";
import { chatRouter } from "./controllers/chat.controller";
import { errorHandler } from "./middleware/error";

export const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.get("/health", (_req, res) => {
    res.json({ ok: true });
});

app.use("/auth", authRouter);
app.use("/users", userRouter);
app.use("/cards", cardRouter);
app.use("/transactions", transactionRouter);
app.use("/transfers", transferRouter);
app.use("/documents", documentRouter);
app.use("/chat", chatRouter);

app.use(errorHandler);
