/**
 * API Route Tests for Attendances Report
 */

import { GET } from '../../../../app/api/reports/attendances/route';

// Create a mock NextRequest class
class MockNextRequest {
  public nextUrl: URL;
  
  constructor(url: string) {
    this.nextUrl = new URL(url);
  }
}

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, init?: any) => {
      const response = {
        status: init?.status || 200,
        json: async () => data
      };
      return response;
    }
  }
}));

// Mock dependencies
jest.mock('@/app/lib/supabase/admin', () => ({
  createAdminClient: jest.fn()
}));

jest.mock('@/app/lib/auth/organization', () => ({
  requireOrgAccess: jest.fn()
}));

const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        gte: jest.fn(() => ({
          lte: jest.fn(() => ({
            in: jest.fn(() => ({
              contains: jest.fn(() => ({
                order: jest.fn(() => ({
                  range: jest.fn(() => ({
                    then: jest.fn()
                  }))
                }))
              }))
            }))
          }))
        }))
      }))
    }))
  }))
};

const mockRequireOrgAccess = require('@/app/lib/auth/organization').requireOrgAccess;
const mockCreateAdminClient = require('@/app/lib/supabase/admin').createAdminClient;

describe('/api/reports/attendances', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateAdminClient.mockResolvedValue(mockSupabase);
    mockRequireOrgAccess.mockResolvedValue({ organizationId: 'test-org-123' });
  });

  describe('GET', () => {
    test('should return individual attendances by default', async () => {
      const mockData = [
        {
          booking_id: 'booking-1',
          customer_id: 'customer-1',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          class_type_name: 'Yoga',
          attendance_status: 'attended',
          organization_id: 'test-org-123'
        }
      ];

      // Mock the query chain
      const mockQuery = {
        select: jest.fn(() => mockQuery),
        eq: jest.fn(() => mockQuery),
        gte: jest.fn(() => mockQuery),
        lte: jest.fn(() => mockQuery),
        order: jest.fn(() => mockQuery),
        range: jest.fn(() => Promise.resolve({
          data: mockData,
          error: null,
          count: 1
        }))
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new MockNextRequest('http://localhost:3000/api/reports/attendances?date_from=2024-01-01&date_to=2024-01-31');
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.attendances).toEqual(mockData);
      expect(data.data.pagination).toBeDefined();
      expect(data.data.group_by).toBe('each');
    });

    test('should return grouped data when group_by is specified', async () => {
      const mockData = [
        {
          customer_id: 'customer-1',
          first_name: 'John',
          last_name: 'Doe',
          attendance_status: 'attended',
          organization_id: 'test-org-123',
          class_start_at: new Date().toISOString()
        },
        {
          customer_id: 'customer-1',
          first_name: 'John',
          last_name: 'Doe',
          attendance_status: 'no_show',
          organization_id: 'test-org-123',
          class_start_at: new Date().toISOString()
        }
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
      };
      
      // Make the query thenable
      (mockQuery as any).then = (resolve: any) => {
        resolve({
          data: mockData,
          error: null
        });
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new MockNextRequest('http://localhost:3000/api/reports/attendances?group_by=customer');
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.grouped_data).toBeDefined();
      expect(Array.isArray(data.data.grouped_data)).toBe(true);
      expect(data.data.group_by).toBe('customer');
    });

    test('should apply date filters correctly', async () => {
      const mockQuery = {
        select: jest.fn(() => mockQuery),
        eq: jest.fn(() => mockQuery),
        gte: jest.fn(() => mockQuery),
        lte: jest.fn(() => mockQuery),
        order: jest.fn(() => mockQuery),
        range: jest.fn(() => Promise.resolve({
          data: [],
          error: null,
          count: 0
        }))
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new MockNextRequest('http://localhost:3000/api/reports/attendances?date_from=2024-01-01T00:00:00Z&date_to=2024-01-31T23:59:59Z');
      await GET(request);

      expect(mockQuery.gte).toHaveBeenCalledWith('class_start_at', '2024-01-01T00:00:00Z');
      expect(mockQuery.lte).toHaveBeenCalledWith('class_start_at', '2024-01-31T23:59:59Z');
    });

    test('should apply organization filter', async () => {
      const mockQuery = {
        select: jest.fn(() => mockQuery),
        eq: jest.fn(() => mockQuery),
        gte: jest.fn(() => mockQuery),
        lte: jest.fn(() => mockQuery),
        order: jest.fn(() => mockQuery),
        range: jest.fn(() => Promise.resolve({
          data: [],
          error: null,
          count: 0
        }))
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new MockNextRequest('http://localhost:3000/api/reports/attendances');
      await GET(request);

      expect(mockQuery.eq).toHaveBeenCalledWith('organization_id', 'test-org-123');
    });

    test('should apply entity filters', async () => {
      const mockQuery = {
        select: jest.fn(() => mockQuery),
        eq: jest.fn(() => mockQuery),
        gte: jest.fn(() => mockQuery),
        lte: jest.fn(() => mockQuery),
        order: jest.fn(() => mockQuery),
        range: jest.fn(() => Promise.resolve({
          data: [],
          error: null,
          count: 0
        }))
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new MockNextRequest('http://localhost:3000/api/reports/attendances?customer_id=customer-123&class_type_id=class-456');
      await GET(request);

      expect(mockQuery.eq).toHaveBeenCalledWith('customer_id', 'customer-123');
      expect(mockQuery.eq).toHaveBeenCalledWith('class_type_id', 'class-456');
    });

    test('should apply array filters', async () => {
      const mockQuery = {
        select: jest.fn(() => mockQuery),
        eq: jest.fn(() => mockQuery),
        gte: jest.fn(() => mockQuery),
        lte: jest.fn(() => mockQuery),
        in: jest.fn(() => mockQuery),
        order: jest.fn(() => mockQuery),
        range: jest.fn(() => Promise.resolve({
          data: [],
          error: null,
          count: 0
        }))
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new MockNextRequest('http://localhost:3000/api/reports/attendances?booking_method=membership&booking_method=drop_in&status=attended&status=registered');
      await GET(request);

      expect(mockQuery.in).toHaveBeenCalledWith('booking_method', ['membership', 'drop_in']);
      expect(mockQuery.in).toHaveBeenCalledWith('attendance_status', ['attended', 'registered']);
    });

    test('should handle pagination parameters', async () => {
      const mockQuery = {
        select: jest.fn(() => mockQuery),
        eq: jest.fn(() => mockQuery),
        gte: jest.fn(() => mockQuery),
        lte: jest.fn(() => mockQuery),
        order: jest.fn(() => mockQuery),
        range: jest.fn(() => Promise.resolve({
          data: [],
          error: null,
          count: 0
        }))
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new MockNextRequest('http://localhost:3000/api/reports/attendances?page=2&page_size=25');
      await GET(request);

      // Page 2 with size 25 should start at offset 25 (range 25-49)
      expect(mockQuery.range).toHaveBeenCalledWith(25, 49);
    });

    test('should exclude future classes by default', async () => {
      const mockQuery = {
        select: jest.fn(() => mockQuery),
        eq: jest.fn(() => mockQuery),
        gte: jest.fn(() => mockQuery),
        lte: jest.fn(() => mockQuery),
        order: jest.fn(() => mockQuery),
        range: jest.fn(() => Promise.resolve({
          data: [],
          error: null,
          count: 0
        }))
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new MockNextRequest('http://localhost:3000/api/reports/attendances');
      await GET(request);

      // Should add filter to exclude future classes
      expect(mockQuery.lte).toHaveBeenCalledWith('class_start_at', expect.any(String));
    });

    test('should include future classes when specified', async () => {
      const mockQuery = {
        select: jest.fn(() => mockQuery),
        eq: jest.fn(() => mockQuery),
        gte: jest.fn(() => mockQuery),
        lte: jest.fn(() => mockQuery),
        order: jest.fn(() => mockQuery),
        range: jest.fn(() => Promise.resolve({
          data: [],
          error: null,
          count: 0
        }))
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new MockNextRequest('http://localhost:3000/api/reports/attendances?include_future=true');
      await GET(request);

      // Should not add the future exclusion filter
      const calls = mockQuery.lte.mock.calls;
      const futureFilters = calls.filter(call => call[0] === 'class_start_at' && !call[1].includes('2024'));
      expect(futureFilters).toHaveLength(0);
    });

    test('should return 401 when organization access is denied', async () => {
      mockRequireOrgAccess.mockRejectedValue(new Error('No organization found'));

      const request = new MockNextRequest('http://localhost:3000/api/reports/attendances');
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('No organization found');
    });

    test('should handle database errors gracefully', async () => {
      const mockQuery = {
        select: jest.fn(() => mockQuery),
        eq: jest.fn(() => mockQuery),
        gte: jest.fn(() => mockQuery),
        lte: jest.fn(() => mockQuery),
        order: jest.fn(() => mockQuery),
        range: jest.fn(() => Promise.resolve({
          data: null,
          error: { message: 'Database connection failed' },
          count: null
        }))
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new MockNextRequest('http://localhost:3000/api/reports/attendances');
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch attendances report');
    });

    test('should handle instructor filter with array contains', async () => {
      const mockQuery = {
        select: jest.fn(() => mockQuery),
        eq: jest.fn(() => mockQuery),
        gte: jest.fn(() => mockQuery),
        lte: jest.fn(() => mockQuery),
        contains: jest.fn(() => mockQuery),
        order: jest.fn(() => mockQuery),
        range: jest.fn(() => Promise.resolve({
          data: [],
          error: null,
          count: 0
        }))
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new MockNextRequest('http://localhost:3000/api/reports/attendances?instructor_id=instructor-123');
      await GET(request);

      expect(mockQuery.contains).toHaveBeenCalledWith('instructor_ids', ['instructor-123']);
    });

    test('should return correct response format for individual records', async () => {
      const mockData = [
        {
          booking_id: 'booking-1',
          organization_id: 'test-org-123',
          first_name: 'John',
          last_name: 'Doe',
          attendance_status: 'attended'
        }
      ];

      const mockQuery = {
        select: jest.fn(() => mockQuery),
        eq: jest.fn(() => mockQuery),
        gte: jest.fn(() => mockQuery),
        lte: jest.fn(() => mockQuery),
        order: jest.fn(() => mockQuery),
        range: jest.fn(() => Promise.resolve({
          data: mockData,
          error: null,
          count: 1
        }))
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new MockNextRequest('http://localhost:3000/api/reports/attendances?page=1&page_size=50');
      const response = await GET(request as any);
      const data = await response.json();

      expect(data).toMatchObject({
        success: true,
        data: {
          attendances: mockData,
          pagination: {
            page: 1,
            page_size: 50,
            total_count: 1,
            total_pages: 1
          },
          group_by: 'each'
        }
      });
    });

    test('should handle empty results for grouped data', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
      };
      
      // Make the query thenable
      (mockQuery as any).then = (resolve: any) => {
        resolve({
          data: null,
          error: null
        });
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new MockNextRequest('http://localhost:3000/api/reports/attendances?group_by=customer');
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.grouped_data).toEqual([]);
      expect(data.data.total_count).toBe(0);
    });
  });
});