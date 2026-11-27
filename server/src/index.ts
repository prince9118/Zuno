import express from "express";
import authRoutes from "./routes/auth";

const app = express();
app.use(express.json());

app.use("/api/auth", authRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`Server listening on port ${port}`));
