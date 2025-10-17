import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getOrganization } from "@/app/lib/organization-server";
import { SOPProcessor } from "@/app/lib/services/sopProcessor";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const organization = await getOrganization();

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const {
      query,
      limit = 10,
      similarity_threshold = 0.7,
      filters = {},
    } = body;

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 },
      );
    }

    const processor = SOPProcessor.getInstance();

    // Generate embedding for search query
    const queryEmbedding = await processor.generateEmbedding(query);

    // Get all SOPs with embeddings (in production, use vector database)
    let sopQuery = supabase
      .from("sops")
      .select(
        `
        *,
        category_info:sop_categories(name, color, icon),
        creator:users!sops_created_by_fkey(id, name, email)
      `,
      )
      .eq("organization_id", organization.id)
      .not("embedding", "is", null);

    // Apply filters
    if (filters.category) {
      sopQuery = sopQuery.eq("category", filters.category);
    }
    if (filters.status) {
      sopQuery = sopQuery.eq("status", filters.status);
    }
    if (filters.training_required !== undefined) {
      sopQuery = sopQuery.eq("training_required", filters.training_required);
    }
    if (filters.tags && filters.tags.length > 0) {
      sopQuery = sopQuery.contains("tags", filters.tags);
    }

    const { data: sops, error } = await sopQuery;

    if (error) {
      console.error("Error fetching SOPs for search:", error);
      return NextResponse.json(
        { error: "Failed to search SOPs" },
        { status: 500 },
      );
    }

    // Calculate similarity scores and rank results
    const searchResults = [];

    for (const sop of sops || []) {
      try {
        const sopEmbedding = JSON.parse(sop.embedding);
        const similarity = cosineSimilarity(queryEmbedding, sopEmbedding);

        if (similarity >= similarity_threshold) {
          // Find matching sections in content
          const matchingSections = await findMatchingSections(
            query,
            sop.content,
            sop.title,
          );

          searchResults.push({
            sop: sop,
            relevance_score: similarity,
            matching_sections: matchingSections,
          });
        }
      } catch (error) {
        console.error(`Error processing SOP ${sop.id}:`, error);
        continue;
      }
    }

    // Sort by relevance score
    searchResults.sort((a, b) => b.relevance_score - a.relevance_score);

    // Limit results
    const limitedResults = searchResults.slice(0, limit);

    // Also perform traditional text search as fallback
    const { data: textSearchResults, error: textError } = await supabase
      .from("sops")
      .select(
        `
        *,
        category_info:sop_categories(name, color, icon),
        creator:users!sops_created_by_fkey(id, name, email)
      `,
      )
      .eq("organization_id", organization.id)
      .or(
        `title.ilike.%${query}%,description.ilike.%${query}%,content.ilike.%${query}%`,
      )
      .limit(5);

    // Combine and deduplicate results
    const combinedResults = [...limitedResults];
    const existingIds = new Set(limitedResults.map((r) => r.sop.id));

    for (const textResult of textSearchResults || []) {
      if (!existingIds.has(textResult.id)) {
        combinedResults.push({
          sop: textResult,
          relevance_score: 0.5, // Lower score for text matches
          matching_sections: await findMatchingSections(
            query,
            textResult.content,
            textResult.title,
          ),
        });
      }
    }

    // Final sort by relevance
    combinedResults.sort((a, b) => b.relevance_score - a.relevance_score);

    return NextResponse.json({
      results: combinedResults,
      total: combinedResults.length,
      query,
      search_type: "semantic_and_text",
    });
  } catch (error) {
    console.error("Error performing SOP search:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const organization = await getOrganization();

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const sopId = url.searchParams.get("sopId");
    const limit = parseInt(url.searchParams.get("limit") || "5");

    if (!sopId) {
      return NextResponse.json(
        { error: "SOP ID is required" },
        { status: 400 },
      );
    }

    // Get the source SOP
    const { data: sourceSop, error: sourceError } = await supabase
      .from("sops")
      .select("embedding, title, content")
      .eq("id", sopId)
      .eq("organization_id", organization.id)
      .single();

    if (sourceError || !sourceSop || !sourceSop.embedding) {
      return NextResponse.json(
        { error: "SOP not found or no embedding available" },
        { status: 404 },
      );
    }

    const sourceEmbedding = JSON.parse(sourceSop.embedding);

    // Find similar SOPs
    const { data: allSops, error } = await supabase
      .from("sops")
      .select(
        `
        *,
        category_info:sop_categories(name, color, icon),
        creator:users!sops_created_by_fkey(id, name, email)
      `,
      )
      .eq("organization_id", organization.id)
      .neq("id", sopId)
      .not("embedding", "is", null);

    if (error) {
      console.error("Error fetching SOPs for similarity:", error);
      return NextResponse.json(
        { error: "Failed to find similar SOPs" },
        { status: 500 },
      );
    }

    const similarSops = [];

    for (const sop of allSops || []) {
      try {
        const sopEmbedding = JSON.parse(sop.embedding);
        const similarity = cosineSimilarity(sourceEmbedding, sopEmbedding);

        if (similarity > 0.6) {
          // Threshold for similarity
          similarSops.push({
            sop,
            similarity_score: similarity,
          });
        }
      } catch (error) {
        console.error(`Error processing SOP ${sop.id}:`, error);
        continue;
      }
    }

    // Sort by similarity and limit
    similarSops.sort((a, b) => b.similarity_score - a.similarity_score);
    const results = similarSops.slice(0, limit);

    return NextResponse.json({
      similar_sops: results,
      source_sop: {
        id: sopId,
        title: sourceSop.title,
      },
    });
  } catch (error) {
    console.error("Error finding similar SOPs:", error);
    return NextResponse.json(
      { error: "Failed to find similar SOPs" },
      { status: 500 },
    );
  }
}

// Helper function to calculate cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

// Helper function to find matching sections in content
async function findMatchingSections(
  query: string,
  content: string,
  title: string,
): Promise<Array<{ content: string; score: number }>> {
  const sections = content
    .split(/\n\s*\n/)
    .filter((section) => section.trim().length > 50);
  const matchingSections = [];

  const queryLower = query.toLowerCase();

  for (const section of sections.slice(0, 10)) {
    // Limit to first 10 sections
    const sectionLower = section.toLowerCase();

    // Simple scoring based on keyword matches
    const queryWords = queryLower.split(/\s+/);
    let score = 0;

    for (const word of queryWords) {
      if (word.length > 2) {
        // Ignore very short words
        const matches = (sectionLower.match(new RegExp(word, "g")) || [])
          .length;
        score += matches * (word.length / queryWords.length);
      }
    }

    if (score > 0) {
      matchingSections.push({
        content:
          section.substring(0, 200) + (section.length > 200 ? "..." : ""),
        score: score,
      });
    }
  }

  // Sort by score and return top matches
  return matchingSections.sort((a, b) => b.score - a.score).slice(0, 3);
}
