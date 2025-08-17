import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getUserAndOrganization } from '@/app/lib/auth-utils';

interface IntegrationValidationRequest {
  integration_type: 'facebook' | 'google' | 'stripe' | 'twilio' | 'whatsapp' | 'email' | 'webhook';
  config: any;
  test_action?: string;
}

interface ValidationResult {
  is_valid: boolean;
  connection_status: 'connected' | 'disconnected' | 'error' | 'warning';
  error_message?: string;
  warnings?: string[];
  test_results?: any;
  capabilities?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: IntegrationValidationRequest = await request.json();
    const { integration_type, config, test_action } = body;

    if (!integration_type || !config) {
      return NextResponse.json({ 
        error: 'Integration type and config are required' 
      }, { status: 400 });
    }

    // Validate integration based on type
    const validationResult = await validateIntegration(integration_type, config, test_action);

    // Save validation result
    await supabase
      .from('integration_validations')
      .insert({
        organization_id: organization.id,
        integration_type,
        config: config,
        validation_result: validationResult,
        validated_by: user.id,
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      validation: validationResult
    });

  } catch (error) {
    console.error('Error validating integration:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      validation: {
        is_valid: false,
        connection_status: 'error',
        error_message: 'Failed to validate integration'
      }
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const integrationType = url.searchParams.get('integration_type');

    // Get integration status for all or specific integration
    let query = supabase
      .from('integration_validations')
      .select('*')
      .eq('organization_id', organization.id);

    if (integrationType) {
      query = query.eq('integration_type', integrationType);
    }

    const { data: validations, error } = await query
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching validations:', error);
      return NextResponse.json({ error: 'Failed to fetch validations' }, { status: 500 });
    }

    // Group by integration type and get latest status
    const integrationStatus: { [key: string]: any } = {};
    
    (validations || []).forEach((validation) => {
      if (!integrationStatus[validation.integration_type]) {
        integrationStatus[validation.integration_type] = validation;
      }
    });

    return NextResponse.json({
      integrations: integrationStatus,
      history: validations || []
    });

  } catch (error) {
    console.error('Error fetching integration status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function validateIntegration(
  type: string, 
  config: any, 
  testAction?: string
): Promise<ValidationResult> {
  switch (type) {
    case 'facebook':
      return await validateFacebookIntegration(config, testAction);
    case 'google':
      return await validateGoogleIntegration(config, testAction);
    case 'stripe':
      return await validateStripeIntegration(config, testAction);
    case 'twilio':
      return await validateTwilioIntegration(config, testAction);
    case 'whatsapp':
      return await validateWhatsAppIntegration(config, testAction);
    case 'email':
      return await validateEmailIntegration(config, testAction);
    case 'webhook':
      return await validateWebhookIntegration(config, testAction);
    default:
      return {
        is_valid: false,
        connection_status: 'error',
        error_message: `Unknown integration type: ${type}`
      };
  }
}

async function validateFacebookIntegration(config: any, testAction?: string): Promise<ValidationResult> {
  try {
    const { access_token, page_id } = config;

    if (!access_token) {
      return {
        is_valid: false,
        connection_status: 'error',
        error_message: 'Access token is required'
      };
    }

    // Test Facebook API connection
    const response = await fetch(`https://graph.facebook.com/me?access_token=${access_token}`);
    
    if (!response.ok) {
      const error = await response.json();
      return {
        is_valid: false,
        connection_status: 'error',
        error_message: `Facebook API error: ${error.error?.message || 'Unknown error'}`
      };
    }

    const userData = await response.json();
    const capabilities = ['read_profile'];

    // Test page access if page_id provided
    if (page_id) {
      const pageResponse = await fetch(`https://graph.facebook.com/${page_id}?access_token=${access_token}`);
      if (pageResponse.ok) {
        capabilities.push('page_access', 'lead_forms');
      } else {
        return {
          is_valid: false,
          connection_status: 'warning',
          error_message: 'Invalid page ID or insufficient permissions',
          warnings: ['Page access failed - check page permissions']
        };
      }
    }

    // Perform test action if specified
    let testResults;
    if (testAction === 'fetch_leads') {
      testResults = await testFacebookLeadFetch(access_token, page_id);
    }

    return {
      is_valid: true,
      connection_status: 'connected',
      capabilities,
      test_results: testResults ? { [testAction!]: testResults } : undefined
    };

  } catch (error) {
    return {
      is_valid: false,
      connection_status: 'error',
      error_message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function validateGoogleIntegration(config: any, testAction?: string): Promise<ValidationResult> {
  try {
    const { client_id, client_secret, refresh_token } = config;

    if (!client_id || !client_secret) {
      return {
        is_valid: false,
        connection_status: 'error',
        error_message: 'Client ID and Client Secret are required'
      };
    }

    // Test token refresh if refresh_token provided
    if (refresh_token) {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id,
          client_secret,
          refresh_token,
          grant_type: 'refresh_token'
        })
      });

      if (!tokenResponse.ok) {
        return {
          is_valid: false,
          connection_status: 'error',
          error_message: 'Failed to refresh access token'
        };
      }

      const tokenData = await tokenResponse.json();
      
      // Test Calendar API access
      const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
      });

      if (!calendarResponse.ok) {
        return {
          is_valid: false,
          connection_status: 'warning',
          warnings: ['Calendar API access failed']
        };
      }
    }

    return {
      is_valid: true,
      connection_status: 'connected',
      capabilities: ['calendar_sync', 'oauth_flow']
    };

  } catch (error) {
    return {
      is_valid: false,
      connection_status: 'error',
      error_message: `Google integration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function validateStripeIntegration(config: any, testAction?: string): Promise<ValidationResult> {
  try {
    const { secret_key, webhook_secret } = config;

    if (!secret_key) {
      return {
        is_valid: false,
        connection_status: 'error',
        error_message: 'Secret key is required'
      };
    }

    // Test Stripe API connection
    const response = await fetch('https://api.stripe.com/v1/account', {
      headers: {
        'Authorization': `Bearer ${secret_key}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        is_valid: false,
        connection_status: 'error',
        error_message: `Stripe API error: ${error.error?.message || 'Invalid API key'}`
      };
    }

    const accountData = await response.json();
    const capabilities = ['payments', 'subscriptions'];

    const warnings = [];
    if (!webhook_secret) {
      warnings.push('Webhook secret not configured - webhooks will not be verified');
    }

    if (!accountData.charges_enabled) {
      warnings.push('Charges not enabled on this Stripe account');
    }

    return {
      is_valid: true,
      connection_status: warnings.length > 0 ? 'warning' : 'connected',
      capabilities,
      warnings: warnings.length > 0 ? warnings : undefined,
      test_results: {
        account_id: accountData.id,
        charges_enabled: accountData.charges_enabled,
        payouts_enabled: accountData.payouts_enabled
      }
    };

  } catch (error) {
    return {
      is_valid: false,
      connection_status: 'error',
      error_message: `Stripe validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function validateTwilioIntegration(config: any, testAction?: string): Promise<ValidationResult> {
  try {
    const { account_sid, auth_token, phone_number } = config;

    if (!account_sid || !auth_token) {
      return {
        is_valid: false,
        connection_status: 'error',
        error_message: 'Account SID and Auth Token are required'
      };
    }

    // Test Twilio API connection
    const auth = Buffer.from(`${account_sid}:${auth_token}`).toString('base64');
    
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${account_sid}.json`, {
      headers: { 'Authorization': `Basic ${auth}` }
    });

    if (!response.ok) {
      return {
        is_valid: false,
        connection_status: 'error',
        error_message: 'Invalid Twilio credentials'
      };
    }

    const accountData = await response.json();
    const capabilities = ['sms'];

    // Check phone number if provided
    const warnings = [];
    if (phone_number) {
      const phoneResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${account_sid}/IncomingPhoneNumbers.json`,
        { headers: { 'Authorization': `Basic ${auth}` } }
      );

      if (phoneResponse.ok) {
        const phoneData = await phoneResponse.json();
        const hasPhoneNumber = phoneData.incoming_phone_numbers.some(
          (p: any) => p.phone_number === phone_number
        );

        if (!hasPhoneNumber) {
          warnings.push('Phone number not found in account');
        } else {
          capabilities.push('voice');
        }
      }
    } else {
      warnings.push('No phone number configured');
    }

    return {
      is_valid: true,
      connection_status: warnings.length > 0 ? 'warning' : 'connected',
      capabilities,
      warnings: warnings.length > 0 ? warnings : undefined,
      test_results: {
        account_status: accountData.status,
        account_type: accountData.type
      }
    };

  } catch (error) {
    return {
      is_valid: false,
      connection_status: 'error',
      error_message: `Twilio validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function validateWhatsAppIntegration(config: any, testAction?: string): Promise<ValidationResult> {
  try {
    const { phone_number_id, access_token } = config;

    if (!phone_number_id || !access_token) {
      return {
        is_valid: false,
        connection_status: 'error',
        error_message: 'Phone number ID and access token are required'
      };
    }

    // Test WhatsApp Business API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phone_number_id}`,
      {
        headers: { 'Authorization': `Bearer ${access_token}` }
      }
    );

    if (!response.ok) {
      return {
        is_valid: false,
        connection_status: 'error',
        error_message: 'Invalid WhatsApp credentials or phone number ID'
      };
    }

    const phoneData = await response.json();

    return {
      is_valid: true,
      connection_status: 'connected',
      capabilities: ['send_messages', 'receive_messages', 'templates'],
      test_results: {
        display_phone_number: phoneData.display_phone_number,
        verified_name: phoneData.verified_name
      }
    };

  } catch (error) {
    return {
      is_valid: false,
      connection_status: 'error',
      error_message: `WhatsApp validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function validateEmailIntegration(config: any, testAction?: string): Promise<ValidationResult> {
  try {
    const { provider, smtp_host, smtp_port, username, password, from_email } = config;

    if (!provider && (!smtp_host || !smtp_port || !username || !password)) {
      return {
        is_valid: false,
        connection_status: 'error',
        error_message: 'Provider or SMTP configuration is required'
      };
    }

    // For now, just validate configuration presence
    // In a real implementation, you might test SMTP connection
    const capabilities = ['send_email'];
    const warnings = [];

    if (!from_email) {
      warnings.push('From email not configured');
    }

    return {
      is_valid: true,
      connection_status: warnings.length > 0 ? 'warning' : 'connected',
      capabilities,
      warnings: warnings.length > 0 ? warnings : undefined
    };

  } catch (error) {
    return {
      is_valid: false,
      connection_status: 'error',
      error_message: `Email validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function validateWebhookIntegration(config: any, testAction?: string): Promise<ValidationResult> {
  try {
    const { webhook_url, secret_key } = config;

    if (!webhook_url) {
      return {
        is_valid: false,
        connection_status: 'error',
        error_message: 'Webhook URL is required'
      };
    }

    // Test webhook endpoint
    if (testAction === 'ping') {
      const testPayload = {
        test: true,
        timestamp: new Date().toISOString(),
        event: 'ping'
      };

      const response = await fetch(webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(secret_key && { 'X-Webhook-Secret': secret_key })
        },
        body: JSON.stringify(testPayload)
      });

      if (!response.ok) {
        return {
          is_valid: false,
          connection_status: 'error',
          error_message: `Webhook test failed: ${response.status} ${response.statusText}`
        };
      }
    }

    const warnings = [];
    if (!secret_key) {
      warnings.push('No secret key configured - webhooks will not be authenticated');
    }

    return {
      is_valid: true,
      connection_status: warnings.length > 0 ? 'warning' : 'connected',
      capabilities: ['webhook_delivery'],
      warnings: warnings.length > 0 ? warnings : undefined
    };

  } catch (error) {
    return {
      is_valid: false,
      connection_status: 'error',
      error_message: `Webhook validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Helper functions for specific tests
async function testFacebookLeadFetch(accessToken: string, pageId?: string): Promise<any> {
  if (!pageId) return { error: 'No page ID provided' };

  try {
    const response = await fetch(
      `https://graph.facebook.com/${pageId}/leadgen_forms?access_token=${accessToken}`
    );

    if (!response.ok) return { error: 'Failed to fetch lead forms' };

    const data = await response.json();
    return {
      forms_count: data.data?.length || 0,
      forms: data.data?.slice(0, 3) || [] // Return first 3 forms as example
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}