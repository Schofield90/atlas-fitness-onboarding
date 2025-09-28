import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !anonKey) {
      return NextResponse.json({ 
        error: "Missing environment variables",
        hasUrl: !!url,
        hasAnonKey: !!anonKey
      }, { status: 500 });
    }
    
    // Try to create a client and make a simple query
    const supabase = createClient(url, anonKey);
    
    // Test the connection with a simple auth check
    const { data, error } = await supabase.auth.getSession();
    
    return NextResponse.json({
      success: true,
      supabaseUrl: url,
      connectionTest: error ? "Failed" : "Success",
      error: error?.message,
      sessionExists: !!data?.session
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}