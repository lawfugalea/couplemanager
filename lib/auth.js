import { withSessionSsr } from "@/lib/session";
export const requireAuth = (gssp) =>
  withSessionSsr(async (ctx) => {
    const user = ctx.req.session.user;
    if (!user) return { redirect: { destination: "/login", permanent: false } };
    if (typeof gssp === "function") {
      const out = await gssp(ctx, user);
      if ("props" in out) out.props = { ...out.props, user };
      return out;
    }
    return { props: { user } };
  });
