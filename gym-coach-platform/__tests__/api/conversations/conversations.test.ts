import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/conversations/route';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs');
jest.mock('next/headers', () => ({
  cookies: jest.fn()
}));

const mockSupabaseClient = {
  auth: {
    getSession: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn()
  })),
  rpc: jest.fn()
};

describe('/api/conversations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createRouteHandlerClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('POST /api/conversations', () => {
    const mockSession = {
      user: { id: 'coach-user-id' }
    };

    const mockUserOrg = {
      organization_id: 'org-123'
    };

    const mockClient = {
      id: 'client-123',
      name: 'John Doe'
    };

    it('should create a new conversation successfully', async () => {
      // Setup mocks
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      // Mock user organization lookup
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUserOrg,
              error: null
            })
          })
        })
      });

      // Mock client verification
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockClient,
                error: null
              })
            })
          })
        })
      });

      // Mock get_or_create_conversation RPC call
      const conversationId = 'conv-123';
      mockSupabaseClient.rpc.mockResolvedValue({
        data: conversationId,
        error: null
      });

      // Mock conversation fetch
      const mockConversation = {
        id: conversationId,
        title: 'John Doe',
        status: 'active',
        last_message_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        clients: {
          id: 'client-123',
          name: 'John Doe',
          email: 'john@example.com'
        }
      };

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockConversation,
              error: null
            })
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        body: JSON.stringify({
          client_id: 'client-123',
          title: 'New conversation'
        }),
        headers: {
          'content-type': 'application/json'
        }
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.conversation).toEqual(mockConversation);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_or_create_conversation', {
        p_organization_id: 'org-123',
        p_client_id: 'client-123',
        p_coach_id: 'coach-user-id'
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null }
      });

      const request = new NextRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ client_id: 'client-123' }),
        headers: { 'content-type': 'application/json' }
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Unauthorized');
    });

    it('should return 400 when client_id is missing', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      const request = new NextRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'content-type': 'application/json' }
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Client ID is required');
    });

    it('should return 404 when user organization is not found', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ client_id: 'client-123' }),
        headers: { 'content-type': 'application/json' }
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error).toBe('Organization not found');
    });

    it('should return 404 when client is not found in organization', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      // Mock user organization lookup - success
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUserOrg,
              error: null
            })
          })
        })
      });

      // Mock client verification - not found
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: null
              })
            })
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ client_id: 'client-123' }),
        headers: { 'content-type': 'application/json' }
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error).toBe('Client not found');
    });

    it('should return 500 when conversation creation fails', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      // Mock successful setup
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUserOrg,
              error: null
            })
          })
        })
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockClient,
                error: null
              })
            })
          })
        })
      });

      // Mock RPC failure (the foreign key constraint scenario)
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: {
          code: '23503',
          message: 'insert or update on table "conversations" violates foreign key constraint',
          details: 'Key (organization_id)=(invalid-org-id) is not present in table "organizations"'
        }
      });

      const request = new NextRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ client_id: 'client-123' }),
        headers: { 'content-type': 'application/json' }
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Failed to create conversation');
    });

    it('should handle duplicate conversation creation gracefully', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      // Mock successful setup
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUserOrg,
              error: null
            })
          })
        })
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockClient,
                error: null
              })
            })
          })
        })
      });

      // Mock RPC returning existing conversation ID
      const existingConversationId = 'existing-conv-123';
      mockSupabaseClient.rpc.mockResolvedValue({
        data: existingConversationId,
        error: null
      });

      const mockExistingConversation = {
        id: existingConversationId,
        title: 'John Doe',
        status: 'active',
        last_message_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        clients: {
          id: 'client-123',
          name: 'John Doe',
          email: 'john@example.com'
        }
      };

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockExistingConversation,
              error: null
            })
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ client_id: 'client-123' }),
        headers: { 'content-type': 'application/json' }
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.conversation).toEqual(mockExistingConversation);
    });
  });

  describe('GET /api/conversations', () => {
    const mockSession = {
      user: { id: 'user-123' }
    };

    const mockUserOrg = {
      organization_id: 'org-123'
    };

    it('should fetch conversations successfully', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUserOrg,
              error: null
            })
          })
        })
      });

      const mockConversations = [
        {
          id: 'conv-1',
          title: 'Client 1',
          status: 'active',
          last_message_at: '2024-01-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          client_id: 'client-1',
          coach_id: 'coach-1',
          clients: { id: 'client-1', name: 'Client 1', email: 'client1@example.com' },
          users: { id: 'coach-1', name: 'Coach 1', email: 'coach1@example.com' },
          messages: [
            { id: 'msg-1', content: 'Hello', sender_type: 'client', created_at: '2024-01-01T00:00:00Z', read_at: null }
          ]
        }
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockConversations,
          error: null
        })
      };

      mockSupabaseClient.from.mockReturnValueOnce(mockQuery);

      const request = new NextRequest('http://localhost:3000/api/conversations?limit=10&offset=0');

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.conversations).toHaveLength(1);
      expect(responseData.conversations[0].unread_count).toBe(1);
      expect(responseData.total).toBe(1);
    });

    it('should filter conversations by client_id when provided', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUserOrg,
              error: null
            })
          })
        })
      });

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      };

      mockSupabaseClient.from.mockReturnValueOnce(mockQuery);

      const request = new NextRequest('http://localhost:3000/api/conversations?client_id=client-123');

      await GET(request);

      // Verify that eq was called twice (once for organization_id, once for client_id)
      expect(mockQuery.eq).toHaveBeenCalledWith('organization_id', 'org-123');
      expect(mockQuery.eq).toHaveBeenCalledWith('client_id', 'client-123');
    });

    it('should return 401 when user is not authenticated', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null }
      });

      const request = new NextRequest('http://localhost:3000/api/conversations');

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Unauthorized');
    });

    it('should return 404 when organization is not found', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/conversations');

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error).toBe('Organization not found');
    });

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUserOrg,
              error: null
            })
          })
        })
      });

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' }
        })
      };

      mockSupabaseClient.from.mockReturnValueOnce(mockQuery);

      const request = new NextRequest('http://localhost:3000/api/conversations');

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Failed to fetch conversations');
    });
  });
});