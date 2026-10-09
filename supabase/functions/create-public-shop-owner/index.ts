import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clean(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Only POST requests are allowed." }, 405);

  let createdShopId: string | null = null;
  let createdUserId: string | null = null;
  let admin: ReturnType<typeof createClient> | null = null;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Required Supabase server environment variables are missing.");
      return json({ error: "Registration service is not configured." }, 500);
    }

    admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let body: Record<string, any>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON request body." }, 400);
    }

    const shop = body?.shop ?? {};
    const owner = body?.owner ?? {};
    const name = clean(shop.name, 120);
    const category = clean(shop.category, 80);
    const businessDetails = shop.business_details && typeof shop.business_details === "object" && !Array.isArray(shop.business_details) ? shop.business_details : {};
    const slug = clean(shop.slug, 80).toLowerCase();
    const email = clean(owner.email, 254).toLowerCase();
    const password = typeof owner.password === "string" ? owner.password : "";
    const fullName = clean(owner.full_name, 120) || name;
    const shopPhone = clean(shop.phone, 40) || null;
    const whatsapp = clean(shop.whatsapp, 40) || null;
    const address = clean(shop.address, 300) || null;
    const description = clean(shop.description, 1000) || null;
    const ownerPhone = clean(owner.phone, 40) || null;

    const { data: categoryRows, error: categoryLookupError } = await admin
      .from("business_category_definitions")
      .select("name")
      .eq("is_active", true);
    if (categoryLookupError) throw categoryLookupError;
    const allowedCategories = (categoryRows ?? []).map((row: { name: string }) => row.name);
    if (!allowedCategories.includes(category)) return json({ error: "Please select a valid business category." }, 400);

    if (!name || !slug || !email || !password || !address || !shopPhone || !fullName) {
      return json({ error: "Please fill all required business, contact and account fields." }, 400);
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return json({ error: "Shop URL slug can contain lowercase letters, numbers and single hyphens between words." }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Please enter a valid owner email address." }, 400);
    }
    if (password.length < 8) {
      return json({ error: "Password must be at least 8 characters." }, 400);
    }

    const { data: existingShop, error: slugError } = await admin
      .from("shops").select("id").eq("slug", slug).maybeSingle();
    if (slugError) throw slugError;
    if (existingShop) return json({ error: "This shop URL slug is already in use." }, 409);

    const { data: shopRow, error: shopError } = await admin
      .from("shops")
      .insert({
        name, slug, phone: shopPhone, whatsapp, address, description, category,
        business_details: businessDetails,
        status: "active",
      })
      .select("id, name, slug, status")
      .single();
    if (shopError || !shopRow) throw shopError ?? new Error("Failed to create business profile.");
    createdShopId = shopRow.id;

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: ownerPhone,
        shop_id: createdShopId,
        role: "owner",
      },
    });

    if (authError || !authData?.user) {
      await admin.from("shops").delete().eq("id", createdShopId);
      createdShopId = null;
      const duplicate = /already registered|already exists|duplicate/i.test(authError?.message ?? "");
      return json({
        error: duplicate ? "An account with this email already exists." : "Could not create the owner account. Please check the details and try again.",
      }, duplicate ? 409 : 400);
    }
    createdUserId = authData.user.id;

    const { data: ownerRow, error: ownerError } = await admin
      .from("owners")
      .insert({
        id: createdUserId,
        shop_id: createdShopId,
        full_name: fullName,
        phone: ownerPhone,
        role: "owner",
      })
      .select("id, shop_id, full_name, phone, role")
      .single();

    if (ownerError || !ownerRow) {
      await admin.auth.admin.deleteUser(createdUserId);
      createdUserId = null;
      await admin.from("shops").delete().eq("id", createdShopId);
      createdShopId = null;
      throw ownerError ?? new Error("Could not create owner profile.");
    }

    return json({
      success: true,
      message: "Business account created successfully.",
      shop: { id: shopRow.id, name: shopRow.name, slug: shopRow.slug, status: shopRow.status },
      owner: { id: ownerRow.id, shop_id: ownerRow.shop_id, full_name: ownerRow.full_name, role: ownerRow.role },
    }, 201);
  } catch (error) {
    console.error("PUBLIC SHOP REGISTRATION ERROR:", error);
    if (admin && createdUserId) {
      try { await admin.auth.admin.deleteUser(createdUserId); } catch (rollbackError) {
        console.error("Auth rollback failed:", rollbackError);
      }
    }
    if (admin && createdShopId) {
      try { await admin.from("shops").delete().eq("id", createdShopId); } catch (rollbackError) {
        console.error("Shop rollback failed:", rollbackError);
      }
    }
    return json({ error: "Could not create the business account. Please try again." }, 500);
  }
});
