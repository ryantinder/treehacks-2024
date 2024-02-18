import { v } from "convex/values";
import { mutation, query} from "./_generated/server";

export const all = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("bets").collect();
  },
});

export const get = query({
  args: { _id: v.string() },
  handler: async (ctx, {_id}) => {
    return await ctx.db.query("bets").filter( (q) => q.eq(q.field("_id"), _id)).first();
  },
});

export const settle = mutation({
  args: { _id: v.id("bets") },
  handler: async (ctx, {_id}) => {
    return await ctx.db.patch( _id, { isSettled: true });
  },
});

export const add = mutation({
  args: { betId: v.string(), address: v.string(), desc: v.string(), createdAt: v.number(), expiry: v.number(), amount: v.number(), isSettled: v.boolean(), emoji: v.string()},
  handler: async (ctx, args) => {
    console.log(args)
    return await ctx.db.insert("bets", {...args});
  },
});
