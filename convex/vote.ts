import { v } from "convex/values";
import { mutation, query} from "./_generated/server";

export const all = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("votes").collect();
  },
});

export const byBetId = query({
  args: { betId: v.string() },
  handler: async (ctx, {betId}) => {
    return await ctx.db.query("votes").filter( (q) => q.eq(q.field("betId"), betId)).collect();
  },
});

export const byUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, {userId}) => {
    return await ctx.db.query("votes").filter( (q) => q.eq(q.field("userId"), userId)).collect();
  },
});

export const add = mutation({
  args: { betId: v.string(), side: v.boolean(), userId: v.string(), name: v.string()},
  handler: async (ctx, args) => {
    console.log(args)
    return await ctx.db.insert("votes", {...args});
  },
});
