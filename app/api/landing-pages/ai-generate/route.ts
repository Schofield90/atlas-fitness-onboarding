import { NextRequest, NextResponse } from "next/server";
import { requireAuthWithOrg } from "@/app/lib/api/auth-check-org";
import { createClient } from "@/app/lib/supabase/server";
import OpenAI from "openai";
import * as cheerio from "cheerio";

// Lazy load OpenAI client to avoid browser environment errors during build
let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// Function to fetch and parse webpage
async function fetchAndParseWebpage(url: string) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract page structure
    const pageStructure = {
      title: $("title").text(),
      metaDescription: $('meta[name="description"]').attr("content"),
      headers: [] as any[],
      sections: [] as any[],
      forms: [] as any[],
      images: [] as any[],
      buttons: [] as any[],
      text: [] as any[],
    };

    // Extract headers
    $('header, nav, .header, .navbar, [class*="header"], [class*="nav"]').each(
      (i, el) => {
        const $el = $(el);
        pageStructure.headers.push({
          html: $el.html()?.substring(0, 500),
          text: $el.text().trim().substring(0, 200),
          links: $el
            .find("a")
            .map((i, a) => $(a).text().trim())
            .get(),
        });
      },
    );

    // Extract hero sections
    $(
      '[class*="hero"], [class*="banner"], .jumbotron, section:first-child',
    ).each((i, el) => {
      const $el = $(el);
      pageStructure.sections.push({
        type: "hero",
        heading: $el.find("h1, h2").first().text().trim(),
        subheading: $el.find("p").first().text().trim(),
        buttons: $el
          .find('a.btn, button, [class*="button"]')
          .map((i, btn) => $(btn).text().trim())
          .get(),
        backgroundImage:
          $el.css("background-image") || $el.find("img").first().attr("src"),
      });
    });

    // Extract features sections
    $('[class*="features"], [class*="services"], .features, .services').each(
      (i, el) => {
        const $el = $(el);
        const features = $el
          .find('[class*="feature"], [class*="service"], .col, .card')
          .map((i, feat) => {
            const $feat = $(feat);
            return {
              title: $feat.find("h3, h4, h5").first().text().trim(),
              description: $feat.find("p").first().text().trim(),
              icon: $feat.find('i, svg, [class*="icon"]').length > 0,
            };
          })
          .get();

        if (features.length > 0) {
          pageStructure.sections.push({
            type: "features",
            title: $el.find("h2, h3").first().text().trim(),
            features: features,
          });
        }
      },
    );

    // Extract CTA sections
    $('[class*="cta"], [class*="call-to-action"], .cta').each((i, el) => {
      const $el = $(el);
      pageStructure.sections.push({
        type: "cta",
        heading: $el.find("h2, h3").first().text().trim(),
        description: $el.find("p").first().text().trim(),
        buttons: $el
          .find("a, button")
          .map((i, btn) => $(btn).text().trim())
          .get(),
      });
    });

    // Extract forms
    $("form").each((i, el) => {
      const $el = $(el);
      const fields = $el
        .find("input, textarea, select")
        .map((i, field) => {
          const $field = $(field);
          return {
            type: $field.prop("type") || $field.prop("tagName").toLowerCase(),
            name: $field.attr("name"),
            placeholder: $field.attr("placeholder"),
            label: $(`label[for="${$field.attr("id")}"]`)
              .text()
              .trim(),
          };
        })
        .get();

      pageStructure.forms.push({
        action: $el.attr("action"),
        method: $el.attr("method"),
        fields: fields,
      });
    });

    // Extract main text content
    $("p, h1, h2, h3, h4, h5, h6").each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 20 && text.length < 500) {
        pageStructure.text.push(text);
      }
    });

    // Extract images
    $("img").each((i, el) => {
      const $el = $(el);
      const src = $el.attr("src");
      if (src && !src.includes("data:image")) {
        pageStructure.images.push({
          src: src,
          alt: $el.attr("alt"),
          width: $el.attr("width"),
          height: $el.attr("height"),
        });
      }
    });

    return pageStructure;
  } catch (error) {
    console.error("Error fetching webpage:", error);
    throw new Error("Failed to fetch and parse webpage");
  }
}

// Function to analyze structure and generate components using OpenAI
async function analyzeAndGenerateComponents(pageStructure: any, url: string) {
  const prompt = `
Analyze this webpage structure and generate a landing page component configuration.

URL: ${url}
Page Structure: ${JSON.stringify(pageStructure, null, 2)}

Based on the extracted structure, create a JSON configuration for a landing page builder with these component types:
- HEADER (navigation)
- HERO (main banner section)
- TEXT (text blocks)
- FEATURES (feature grid)
- FORM (contact/lead forms)
- CTA (call-to-action sections)
- IMAGE (image blocks)
- BUTTON (action buttons)

Return a JSON object with:
{
  "name": "Generated from [domain]",
  "description": "Brief description of the page",
  "components": [
    {
      "type": "COMPONENT_TYPE",
      "props": { /* component-specific props */ }
    }
  ],
  "styles": {
    "primaryColor": "#hex",
    "secondaryColor": "#hex",
    "fontFamily": "font-name"
  },
  "meta": {
    "title": "page title",
    "description": "meta description"
  }
}

Make sure props match these component interfaces:
- HEADER: { logoText, menuItems: [{label, href}], ctaButton: {label, href} }
- HERO: { title, subtitle, description, primaryButton: {label, href}, backgroundColor }
- TEXT: { content, fontSize, textAlign }
- FEATURES: { title, subtitle, features: [{icon, title, description}] }
- FORM: { title, description, fields: [{id, type, label, required}], submitLabel }
- CTA: { title, description, primaryButton: {label, href} }
- IMAGE: { src, alt, caption }
- BUTTON: { label, href, variant, size }

Return ONLY valid JSON, no additional text.
`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content:
            "You are an expert at analyzing web pages and creating landing page templates. Always return valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from AI");

    return JSON.parse(content);
  } catch (error) {
    console.error("Error with OpenAI:", error);
    throw new Error("Failed to analyze page structure");
  }
}

// POST - Generate landing page from URL
export async function POST(request: NextRequest) {
  let authUser;
  try {
    authUser = await requireAuthWithOrg();
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: userId, organizationId } = authUser;
  const { url } = await request.json();

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  const supabase = await createClient();

  try {
    // Create AI generation record
    const { data: generation, error: genError } = await supabase
      .from("ai_template_generations")
      .insert({
        organization_id: organizationId,
        source_url: url,
        status: "processing",
        created_by: userId,
        ai_model: "gpt-4-turbo-preview",
      })
      .select()
      .single();

    if (genError) {
      throw new Error(genError.message);
    }

    // Fetch and parse the webpage
    const pageStructure = await fetchAndParseWebpage(url);

    // Generate components using AI
    const generatedTemplate = await analyzeAndGenerateComponents(
      pageStructure,
      url,
    );

    // Update generation record with result
    await supabase
      .from("ai_template_generations")
      .update({
        generated_content: generatedTemplate.components,
        generated_styles: generatedTemplate.styles,
        status: "completed",
      })
      .eq("id", generation.id);

    // Create the landing page
    const { data: landingPage, error: pageError } = await supabase
      .from("landing_pages")
      .insert({
        organization_id: organizationId,
        name:
          generatedTemplate.name || `Generated from ${new URL(url).hostname}`,
        slug: `generated-${Date.now()}`,
        title: generatedTemplate.meta?.title || generatedTemplate.name,
        description:
          generatedTemplate.meta?.description || generatedTemplate.description,
        content: generatedTemplate.components,
        styles: generatedTemplate.styles,
        settings: {},
        meta_title: generatedTemplate.meta?.title,
        meta_description: generatedTemplate.meta?.description,
        status: "draft",
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single();

    if (pageError) {
      throw new Error(pageError.message);
    }

    // Update generation with landing page reference
    await supabase
      .from("ai_template_generations")
      .update({
        landing_page_id: landingPage.id,
      })
      .eq("id", generation.id);

    return NextResponse.json({
      success: true,
      data: landingPage,
      generation: generation,
      message: `Successfully generated landing page from ${url}`,
    });
  } catch (error: any) {
    console.error("AI generation error:", error);

    // Update generation record with error
    const generation = (error as any).generation;
    if (generation?.id) {
      await supabase
        .from("ai_template_generations")
        .update({
          status: "failed",
          error_message: error.message,
        })
        .eq("id", generation.id);
    }

    return NextResponse.json(
      {
        error: error.message || "Failed to generate landing page from URL",
      },
      { status: 500 },
    );
  }
}
