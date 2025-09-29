import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Get portal access
    const { data: portalAccess, error } = await adminSupabase
      .from("client_portal_access")
      .select(
        `
        *,
        clients (*)
      `,
      )
      .eq("magic_link_token", token)
      .single();

    if (error || !portalAccess) {
      return NextResponse.json(
        {
          error: "Invalid token",
          details: error,
        },
        { status: 400 },
      );
    }

    if (portalAccess.is_claimed) {
      return NextResponse.json(
        {
          error: "Already claimed",
          client: portalAccess.clients,
        },
        { status: 400 },
      );
    }

    // Create a simple form for password setup
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Set Up Your Password</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f3f4f6;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .container {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      max-width: 400px;
      width: 100%;
    }
    h1 {
      margin: 0 0 1rem 0;
      font-size: 1.5rem;
    }
    .info {
      background: #f9fafb;
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 1.5rem;
    }
    input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      margin-bottom: 1rem;
      font-size: 1rem;
    }
    button {
      width: 100%;
      padding: 0.75rem;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
    }
    button:hover {
      background: #2563eb;
    }
    .error {
      color: #dc2626;
      margin-bottom: 1rem;
    }
    .success {
      color: #059669;
      margin-bottom: 1rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Welcome ${portalAccess.clients.first_name}!</h1>
    <p>Set up your password to access your client portal.</p>
    
    <div class="info">
      <strong>Email:</strong> ${portalAccess.clients.email}
    </div>
    
    <div id="message"></div>
    
    <form id="setupForm">
      <input type="password" id="password" placeholder="Choose a password" required minlength="6">
      <input type="password" id="confirmPassword" placeholder="Confirm password" required>
      <button type="submit">Create Account</button>
    </form>
  </div>
  
  <script>
    const form = document.getElementById('setupForm');
    const messageDiv = document.getElementById('message');
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      
      if (password !== confirmPassword) {
        messageDiv.innerHTML = '<div class="error">Passwords do not match</div>';
        return;
      }
      
      try {
        const response = await fetch('/api/client-portal/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            portalAccessId: '${portalAccess.id}',
            clientId: '${portalAccess.client_id}',
            email: '${portalAccess.clients.email}',
            password: password,
            clientName: '${portalAccess.clients.name || portalAccess.clients.first_name + " " + portalAccess.clients.last_name}'
          })
        });
        
        const result = await response.json();
        
        if (response.ok) {
          messageDiv.innerHTML = '<div class="success">Account created! Redirecting...</div>';
          
          // Try to sign in
          const signInResponse = await fetch('/api/auth/callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: '${portalAccess.clients.email}',
              password: password
            })
          });
          
          setTimeout(() => {
            window.location.href = '/client/dashboard';
          }, 2000);
        } else {
          messageDiv.innerHTML = '<div class="error">' + (result.error || 'Failed to create account') + '</div>';
        }
      } catch (error) {
        messageDiv.innerHTML = '<div class="error">An error occurred. Please try again.</div>';
      }
    });
  </script>
</body>
</html>
    `;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Server error",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
