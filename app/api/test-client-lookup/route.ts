import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Test different search methods
    const email = "samschofield90@hotmail.co.uk";

    // Method 1: Case-insensitive ILIKE
    const { data: ilikeResult, error: ilikeError } = await supabase
      .from("clients")
      .select("id, email, first_name, last_name, user_id")
      .ilike("email", email)
      .maybeSingle();

    // Method 2: Exact lowercase match
    const { data: lowerResult, error: lowerError } = await supabase
      .from("clients")
      .select("id, email, first_name, last_name, user_id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    // Method 3: Get all clients to see what's there
    const { data: allClients, error: allError } = await supabase
      .from("clients")
      .select("id, email, first_name, last_name")
      .or("email.ilike.%samschofield%,email.ilike.%hotmail%")
      .limit(10);

    // Method 4: Get ANY client to verify connection works
    const { data: anyClient, error: anyError } = await supabase
      .from("clients")
      .select("id, email")
      .limit(5);

    // Method 5: Check customers table instead
    const { data: anyCustomer, error: customerError } = await supabase
      .from("customers")
      .select("id, email, first_name, last_name")
      .or("email.ilike.%samschofield%,email.ilike.%hotmail%")
      .limit(10);

    return NextResponse.json({
      searchedEmail: email,
      results: {
        ilike: { data: ilikeResult, error: ilikeError },
        lowercase: { data: lowerResult, error: lowerError },
        similar: { data: allClients, error: allError },
        any: { data: anyClient, error: anyError },
        customers: { data: anyCustomer, error: customerError },
      },
    });
  } catch (error) {
    console.error("Test lookup error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
