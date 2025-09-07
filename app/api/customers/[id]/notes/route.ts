import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";
import { getUserAndOrganization } from "@/app/lib/auth-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customerId = params.id;

    // Get notes for this customer
    const { data: notes, error } = await supabase
      .from("customer_notes")
      .select(
        `
        *,
        created_by_user:auth.users!customer_notes_created_by_fkey(
          email,
          raw_user_meta_data
        )
      `,
      )
      .or(`customer_id.eq.${customerId},client_id.eq.${customerId}`)
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notes:", error);
      return NextResponse.json(
        { error: "Failed to fetch notes" },
        { status: 500 },
      );
    }

    // Transform the data to include user names
    const transformedNotes =
      notes?.map((note) => ({
        ...note,
        created_by_name:
          note.created_by_user?.raw_user_meta_data?.full_name ||
          note.created_by_user?.email?.split("@")[0] ||
          "Unknown User",
        created_by_email: note.created_by_user?.email,
      })) || [];

    return NextResponse.json({ notes: transformedNotes });
  } catch (error) {
    console.error("Error in GET /api/customers/[id]/notes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customerId = params.id;
    const body = await request.json();
    const { content, is_internal = true } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Note content is required" },
        { status: 400 },
      );
    }

    // Check if customer exists in leads or clients
    const { data: leadCheck } = await supabase
      .from("leads")
      .select("id")
      .eq("id", customerId)
      .eq("organization_id", organization.id)
      .single();

    const { data: clientCheck } = await supabase
      .from("clients")
      .select("id")
      .eq("id", customerId)
      .eq("org_id", organization.id)
      .single();

    if (!leadCheck && !clientCheck) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );
    }

    // Create the note
    const noteData: any = {
      content: content.trim(),
      is_internal,
      created_by: user.id,
      organization_id: organization.id,
    };

    // Set either customer_id or client_id based on which table the customer exists in
    if (leadCheck) {
      noteData.customer_id = customerId;
    } else {
      noteData.client_id = customerId;
    }

    const { data: note, error: noteError } = await supabase
      .from("customer_notes")
      .insert(noteData)
      .select(
        `
        *,
        created_by_user:auth.users!customer_notes_created_by_fkey(
          email,
          raw_user_meta_data
        )
      `,
      )
      .single();

    if (noteError) {
      console.error("Error creating note:", noteError);
      return NextResponse.json(
        { error: "Failed to create note", details: noteError.message },
        { status: 500 },
      );
    }

    // Transform the response
    const transformedNote = {
      ...note,
      created_by_name:
        note.created_by_user?.raw_user_meta_data?.full_name ||
        note.created_by_user?.email?.split("@")[0] ||
        "Unknown User",
      created_by_email: note.created_by_user?.email,
    };

    return NextResponse.json({
      success: true,
      note: transformedNote,
    });
  } catch (error) {
    console.error("Error in POST /api/customers/[id]/notes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const noteId = url.searchParams.get("noteId");

    if (!noteId) {
      return NextResponse.json(
        { error: "Note ID is required" },
        { status: 400 },
      );
    }

    // Delete the note (RLS policies will handle authorization)
    const { error } = await supabase
      .from("customer_notes")
      .delete()
      .eq("id", noteId)
      .eq("organization_id", organization.id);

    if (error) {
      console.error("Error deleting note:", error);
      return NextResponse.json(
        { error: "Failed to delete note" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/customers/[id]/notes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
