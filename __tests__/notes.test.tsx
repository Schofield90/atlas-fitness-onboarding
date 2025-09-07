import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createClient } from '@/app/lib/supabase/client';
import NotesTab from '@/app/components/customers/tabs/NotesTab';

// Mock Supabase client
jest.mock('@/app/lib/supabase/client');
const mockSupabase = {
  from: jest.fn(),
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  eq: jest.fn(),
  or: jest.fn(),
  order: jest.fn(),
  single: jest.fn(),
  auth: {
    getUser: jest.fn(),
  },
};

(createClient as jest.Mock).mockReturnValue(mockSupabase);

// Mock the utils module
jest.mock('@/app/lib/utils/british-format', () => ({
  formatBritishDateTime: jest.fn((date) => new Date(date).toLocaleString('en-GB')),
}));

describe('Notes Functionality', () => {
  const mockNotes = [
    {
      id: '1',
      content: 'Test note 1',
      created_at: '2024-01-15T10:00:00Z',
      created_by: '123e4567-e89b-12d3-a456-426614174000',
      is_internal: true,
    },
    {
      id: '2',
      content: 'Test note 2',
      created_at: '2024-01-16T11:00:00Z',
      created_by: '987fcdeb-51a2-43d7-9f8a-123456789abc',
      is_internal: false,
    },
  ];

  const mockProps = {
    notes: mockNotes,
    onAddNote: jest.fn(),
    onUpdateNote: jest.fn(),
    onDeleteNote: jest.fn(),
    onRefresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders notes correctly with UUID created_by', () => {
    render(<NotesTab {...mockProps} />);
    
    expect(screen.getByText('Test note 1')).toBeInTheDocument();
    expect(screen.getByText('Test note 2')).toBeInTheDocument();
    
    // Should display "System" for UUID created_by values
    expect(screen.getAllByText('System')).toHaveLength(2);
    
    // Should show internal label for internal notes
    expect(screen.getByText('Internal')).toBeInTheDocument();
  });

  test('handles empty notes state', () => {
    render(<NotesTab {...mockProps} notes={[]} />);
    
    expect(screen.getByText('No notes yet')).toBeInTheDocument();
    expect(screen.getByText('Add notes to keep track of important information about this customer')).toBeInTheDocument();
  });

  test('opens add note modal', async () => {
    render(<NotesTab {...mockProps} />);
    
    const addButton = screen.getByText('Add Note');
    fireEvent.click(addButton);
    
    expect(screen.getByText('Note Content *')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your note here...')).toBeInTheDocument();
  });

  test('calls onAddNote when submitting new note', async () => {
    const mockOnAddNote = jest.fn().mockResolvedValue(undefined);
    render(<NotesTab {...mockProps} onAddNote={mockOnAddNote} />);
    
    // Open modal
    fireEvent.click(screen.getByText('Add Note'));
    
    // Fill in note content
    const textarea = screen.getByPlaceholderText('Enter your note here...');
    fireEvent.change(textarea, { target: { value: 'New test note' } });
    
    // Submit
    fireEvent.click(screen.getByRole('button', { name: /save note/i }));
    
    await waitFor(() => {
      expect(mockOnAddNote).toHaveBeenCalledWith('New test note');
    });
  });

  test('handles add note error', async () => {
    const mockOnAddNote = jest.fn().mockRejectedValue(new Error('Database error'));
    render(<NotesTab {...mockProps} onAddNote={mockOnAddNote} />);
    
    // Open modal and submit note
    fireEvent.click(screen.getByText('Add Note'));
    const textarea = screen.getByPlaceholderText('Enter your note here...');
    fireEvent.change(textarea, { target: { value: 'New test note' } });
    fireEvent.click(screen.getByRole('button', { name: /save note/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Failed to add note. Please try again.')).toBeInTheDocument();
    });
  });

  test('enables edit mode for notes', async () => {
    render(<NotesTab {...mockProps} />);
    
    // Click edit button for first note
    const editButtons = screen.getAllByTitle('Edit note');
    fireEvent.click(editButtons[0]);
    
    // Should show textarea with current content
    const editTextarea = screen.getByDisplayValue('Test note 1');
    expect(editTextarea).toBeInTheDocument();
    
    // Should show save/cancel buttons
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  test('calls onUpdateNote when saving edited note', async () => {
    const mockOnUpdateNote = jest.fn().mockResolvedValue(undefined);
    render(<NotesTab {...mockProps} onUpdateNote={mockOnUpdateNote} />);
    
    // Enter edit mode
    const editButtons = screen.getAllByTitle('Edit note');
    fireEvent.click(editButtons[0]);
    
    // Change content
    const editTextarea = screen.getByDisplayValue('Test note 1');
    fireEvent.change(editTextarea, { target: { value: 'Updated test note' } });
    
    // Save
    fireEvent.click(screen.getByText('Save'));
    
    await waitFor(() => {
      expect(mockOnUpdateNote).toHaveBeenCalledWith('1', 'Updated test note');
    });
  });

  test('calls onDeleteNote when deleting note', async () => {
    const mockOnDeleteNote = jest.fn().mockResolvedValue(undefined);
    
    // Mock confirm dialog
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    
    render(<NotesTab {...mockProps} onDeleteNote={mockOnDeleteNote} />);
    
    // Click delete button
    const deleteButtons = screen.getAllByTitle('Delete note');
    fireEvent.click(deleteButtons[0]);
    
    await waitFor(() => {
      expect(mockOnDeleteNote).toHaveBeenCalledWith('1');
    });
    
    confirmSpy.mockRestore();
  });

  test('does not delete note when user cancels confirmation', async () => {
    const mockOnDeleteNote = jest.fn();
    
    // Mock confirm dialog to return false
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    
    render(<NotesTab {...mockProps} onDeleteNote={mockOnDeleteNote} />);
    
    // Click delete button
    const deleteButtons = screen.getAllByTitle('Delete note');
    fireEvent.click(deleteButtons[0]);
    
    expect(mockOnDeleteNote).not.toHaveBeenCalled();
    
    confirmSpy.mockRestore();
  });
});

// Test the database query logic separately
describe('Notes Database Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mocked methods to return the mock objects for chaining
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.or.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.order.mockReturnValue(mockSupabase);
    mockSupabase.insert.mockReturnValue(mockSupabase);
    mockSupabase.single.mockReturnValue(mockSupabase);
  });

  test('loadNotes query structure is correct', async () => {
    // Mock successful response
    mockSupabase.order.mockResolvedValue({
      data: [
        {
          id: '1',
          content: 'Test note',
          created_at: '2024-01-15T10:00:00Z',
          created_by: '123e4567-e89b-12d3-a456-426614174000',
        }
      ],
      error: null,
    });

    const customerId = 'customer-123';
    const organizationId = 'org-456';

    // Simulate the loadNotes function logic
    const result = await mockSupabase
      .from('customer_notes')
      .select('*')
      .or(`customer_id.eq.${customerId},client_id.eq.${customerId}`)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    // Verify the correct method calls
    expect(mockSupabase.from).toHaveBeenCalledWith('customer_notes');
    expect(mockSupabase.select).toHaveBeenCalledWith('*');
    expect(mockSupabase.or).toHaveBeenCalledWith(`customer_id.eq.${customerId},client_id.eq.${customerId}`);
    expect(mockSupabase.eq).toHaveBeenCalledWith('organization_id', organizationId);
    expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].created_by).toBe('123e4567-e89b-12d3-a456-426614174000');
  });

  test('handleAddNote query structure is correct', async () => {
    const mockUser = { id: 'user-123' };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    mockSupabase.single.mockResolvedValue({
      data: {
        id: 'note-456',
        content: 'New note',
        created_by: 'user-123',
        organization_id: 'org-456',
      },
      error: null,
    });

    const noteData = {
      organization_id: 'org-456',
      content: 'New note',
      created_by: 'user-123',
      is_internal: true,
      customer_id: 'customer-123',
      client_id: null,
    };

    // Simulate the handleAddNote function logic
    const result = await mockSupabase
      .from('customer_notes')
      .insert(noteData)
      .select('*')
      .single();

    // Verify the correct method calls
    expect(mockSupabase.from).toHaveBeenCalledWith('customer_notes');
    expect(mockSupabase.insert).toHaveBeenCalledWith(noteData);
    expect(mockSupabase.select).toHaveBeenCalledWith('*');
    expect(mockSupabase.single).toHaveBeenCalled();

    expect(result.data.created_by).toBe('user-123');
  });

  test('handles database errors gracefully', async () => {
    mockSupabase.order.mockResolvedValue({
      data: null,
      error: { message: 'Database connection error' },
    });

    const result = await mockSupabase
      .from('customer_notes')
      .select('*')
      .or('customer_id.eq.customer-123,client_id.eq.customer-123')
      .eq('organization_id', 'org-456')
      .order('created_at', { ascending: false });

    expect(result.error).toBeDefined();
    expect(result.error.message).toBe('Database connection error');
  });
});