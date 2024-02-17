import { v } from "convex/values";
import { mutation, query} from "./_generated/server";

export const get = query({
  args: { id: v.number()},
  handler: async (ctx, {id}) => {
    console.log("convex", id)
    return await ctx.db.query("keys").filter( (q) => q.eq(q.field("id"), id)).first();
  },
});

export const create = mutation({
  args: { id: v.number(), key: v.string(), address: v.string()},
  handler: async (ctx, args) => {
    return await ctx.db.insert("keys", {...args});
  },
});