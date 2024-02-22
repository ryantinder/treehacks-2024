import { v } from "convex/values";
import { mutation, query} from "./_generated/server";

export const get = query({
  args: { id: v.string()},
  handler: async (ctx, {id}) => {
    console.log("convex", id)
    return await ctx.db.query("keys").filter( (q) => q.eq(q.field("id"), id)).first();
  },
});

export const byAddress = query({
  args: { address: v.string()},
  handler: async (ctx, {address}) => {
    console.log("convex", address)
    return await ctx.db.query("keys").filter( (q) => q.eq(q.field("address"), address)).first();
  },
});

export const create = mutation({
  args: { id: v.string(), key: v.string(), address: v.string(), name: v.string(), deviceToken: v.string()},
  handler: async (ctx, args) => {
    return await ctx.db.insert("keys", {...args});
  },
});

export const updateDeviceToken = mutation({
  args: { id: v.id("keys"), deviceToken: v.string()},
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, {deviceToken: args.deviceToken});
  },
})
