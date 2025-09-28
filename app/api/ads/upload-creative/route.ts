import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get current user and organization
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: user } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", session.user.id)
      .single();

    if (!user?.organization_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!type || !["image", "video"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be image or video" },
        { status: 400 },
      );
    }

    // Validate file type and size
    const maxSize = type === "video" ? 100 * 1024 * 1024 : 10 * 1024 * 1024; // 100MB for video, 10MB for image
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB`,
        },
        { status: 400 },
      );
    }

    const allowedImageTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    const allowedVideoTypes = [
      "video/mp4",
      "video/mov",
      "video/avi",
      "video/quicktime",
    ];

    if (type === "image" && !allowedImageTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Invalid image type. Allowed: JPEG, PNG, GIF, WebP",
        },
        { status: 400 },
      );
    }

    if (type === "video" && !allowedVideoTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Invalid video type. Allowed: MP4, MOV, AVI, QuickTime",
        },
        { status: 400 },
      );
    }

    // Create unique filename
    const fileExtension = file.name.split(".").pop();
    const fileName = `${user.organization_id}/${type}s/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

    try {
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("ad-creatives")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        return NextResponse.json(
          {
            error: "Failed to upload file to storage",
          },
          { status: 500 },
        );
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("ad-creatives")
        .getPublicUrl(fileName);

      if (!urlData.publicUrl) {
        return NextResponse.json(
          {
            error: "Failed to get public URL for uploaded file",
          },
          { status: 500 },
        );
      }

      // For images, we can also upload to Facebook and get a hash
      let facebookHash = null;
      let facebookImageId = null;

      if (type === "image") {
        try {
          // Get active Facebook integration
          const { data: integration } = await supabase
            .from("facebook_integrations")
            .select("access_token")
            .eq("organization_id", user.organization_id)
            .eq("is_active", true)
            .single();

          if (integration && integration.access_token) {
            // Convert file to buffer for Facebook upload
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Upload to Facebook
            const fbFormData = new FormData();
            fbFormData.append(
              "source",
              new Blob([buffer], { type: file.type }),
              file.name,
            );
            fbFormData.append("access_token", integration.access_token);

            const fbResponse = await fetch(
              "https://graph.facebook.com/v18.0/me/adimages",
              {
                method: "POST",
                body: fbFormData,
              },
            );

            if (fbResponse.ok) {
              const fbData = await fbResponse.json();
              if (fbData.images && Object.keys(fbData.images).length > 0) {
                const imageKey = Object.keys(fbData.images)[0];
                facebookHash = fbData.images[imageKey].hash;
                facebookImageId = imageKey;
              }
            }
          }
        } catch (fbError) {
          console.warn(
            "Failed to upload to Facebook, but file uploaded to storage:",
            fbError,
          );
        }
      }

      // For videos, we would upload to Facebook differently
      if (type === "video") {
        try {
          const { data: integration } = await supabase
            .from("facebook_integrations")
            .select(
              "access_token, facebook_integrations!inner(facebook_ad_account_id)",
            )
            .eq("organization_id", user.organization_id)
            .eq("is_active", true)
            .single();

          if (integration && integration.access_token) {
            // For video upload to Facebook, we'd need to implement Facebook's video upload flow
            // This is more complex and involves creating a video upload session
            // For now, we'll just use the Supabase URL
          }
        } catch (fbError) {
          console.warn("Failed to upload video to Facebook:", fbError);
        }
      }

      const responseData: any = {
        success: true,
        url: urlData.publicUrl,
        filename: fileName,
        type: type,
        size: file.size,
        mime_type: file.type,
      };

      if (facebookHash) {
        responseData.facebook_hash = facebookHash;
        responseData.facebook_image_id = facebookImageId;
      }

      return NextResponse.json(responseData);
    } catch (error) {
      console.error("Upload error:", error);
      return NextResponse.json(
        {
          error: "Failed to upload file",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error uploading creative:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
