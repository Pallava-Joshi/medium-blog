import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { sign, verify } from "hono/jwt";

const app = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
  Variables: {
    userId: string;
  };
}>();

app.post("/api/v1/signup", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const { email, password } = await c.req.json();

  const user = await prisma.user.create({
    data: {
      email,
      password,
    },
  });

  const token = await sign({ id: user.id }, c.env.JWT_SECRET);

  return c.json({
    jwt: token,
  });
});

app.post("/api/v1/signin", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const { email, password } = await c.req.json();

  const user = await prisma.user.findUnique({
    where: {
      email,
      password,
    },
  });

  if (!user) {
    c.status(403);
    return c.json({ Error: "user not found" });
  }

  const jwt = await sign({ id: user.id }, c.env.JWT_SECRET);
  return c.json({ jwt });
});

app.use("/api/v1/blog/*", async (c, next) => {
  const jwt = c.req.header("Authorization");
  if (!jwt) return c.json({ error: "unauthorized" });

  const token = jwt.split(" ")[1];
  const payload = await verify(token, c.env.JWT_SECRET);
  if (!payload) {
    c.status(401);
    return c.json({ error: "unathorised" });
  }
  // @ts-ignore
  c.set("userId", payload.id);
  // console.log("userId set:", payload.id);
  await next();
});

app.post("/api/v1/blog", (c) => {
  const userId = c.get("userId");
  console.log("userId retrieved:", userId);
  return c.text("signin route");
});

// app.put("/api/v1/blog", (c) => {
//   return c.text("signin route");
// });

// app.get("/api/v1/blog/:id", (c) => {
//   const id = c.req.param("id");
//   console.log(id);
//   return c.text("get blog route");
// });
export default app;
