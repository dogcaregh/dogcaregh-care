import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const db = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    ghana_card_number, legal_name, address, address_proof_type,
    ref1_name, ref1_phone, ref2_name, ref2_phone,
    applying_level2, notes,
  } = body;

  if (!ghana_card_number?.trim() || !legal_name?.trim() || !address?.trim()
    || !ref1_name?.trim() || !ref1_phone?.trim()
    || !ref2_name?.trim() || !ref2_phone?.trim()) {
    return NextResponse.json({ error: "All required fields must be filled in" }, { status: 400 });
  }

  const service = db();

  const { data: provider, error: pvErr } = await service
    .from("providers")
    .select("id, verification_status")
    .eq("user_id", user.id)
    .single();

  if (pvErr || !provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  if (provider.verification_status === "approved") {
    return NextResponse.json({ error: "Already verified" }, { status: 400 });
  }

  const { error } = await service
    .from("providers")
    .update({
      verification_status: "pending",
      verification_note:   null,
      verification_docs: {
        ghana_card_number: ghana_card_number.trim(),
        legal_name:        legal_name.trim(),
        address:           address.trim(),
        address_proof_type: address_proof_type ?? "utility_bill",
        ref1_name:         ref1_name.trim(),
        ref1_phone:        ref1_phone.trim(),
        ref2_name:         ref2_name.trim(),
        ref2_phone:        ref2_phone.trim(),
        applying_level2:   !!applying_level2,
        notes:             notes?.trim() || null,
        submitted_at:      new Date().toISOString(),
      },
    })
    .eq("id", provider.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
