import { useState, useCallback } from 'react';
import type { StaffCalendarBooking } from '../SharedStaffCalendar';

interface DragState {
  isDragging: boolean;
  draggedBooking: StaffCalendarBooking | null;
  dragOffset: { x: number; y: number };
  dropTarget: { date: Date; timeSlot: number } | null;
}

interface UseDragAndDropReturn {
  dragState: DragState;
  handleDragStart: (booking: StaffCalendarBooking, event: React.MouseEvent) => void;
  handleDragMove: (event: React.MouseEvent) => void;
  handleDragEnd: () => void;
  handleDropZoneEnter: (date: Date, timeSlot: number) => void;
  handleDropZoneLeave: () => void;
  onBookingMove?: (bookingId: string, newDate: Date, newTimeSlot: number) => Promise<void>;
}

export const useDragAndDrop = (
  onBookingMove?: (bookingId: string, newDate: Date, newTimeSlot: number) => Promise<void>
): UseDragAndDropReturn => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedBooking: null,
    dragOffset: { x: 0, y: 0 },
    dropTarget: null
  });

  const handleDragStart = useCallback((booking: StaffCalendarBooking, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const offset = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    setDragState({
      isDragging: true,
      draggedBooking: booking,
      dragOffset: offset,
      dropTarget: null
    });

    // Prevent default drag behavior
    event.preventDefault();
  }, []);

  const handleDragMove = useCallback((event: React.MouseEvent) => {
    if (!dragState.isDragging) return;

    // Update drag position (this would be used for visual feedback)
    // In a real implementation, you'd update the visual position of the dragged element
  }, [dragState.isDragging]);

  const handleDragEnd = useCallback(async () => {
    if (!dragState.isDragging || !dragState.draggedBooking || !dragState.dropTarget) {
      setDragState({
        isDragging: false,
        draggedBooking: null,
        dragOffset: { x: 0, y: 0 },
        dropTarget: null
      });
      return;
    }

    try {
      if (onBookingMove) {
        await onBookingMove(
          dragState.draggedBooking.id,
          dragState.dropTarget.date,
          dragState.dropTarget.timeSlot
        );
      }
    } catch (error) {
      console.error('Failed to move booking:', error);
    } finally {
      setDragState({
        isDragging: false,
        draggedBooking: null,
        dragOffset: { x: 0, y: 0 },
        dropTarget: null
      });
    }
  }, [dragState, onBookingMove]);

  const handleDropZoneEnter = useCallback((date: Date, timeSlot: number) => {
    if (!dragState.isDragging) return;

    setDragState(prev => ({
      ...prev,
      dropTarget: { date, timeSlot }
    }));
  }, [dragState.isDragging]);

  const handleDropZoneLeave = useCallback(() => {
    setDragState(prev => ({
      ...prev,
      dropTarget: null
    }));
  }, []);

  return {
    dragState,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDropZoneEnter,
    handleDropZoneLeave
  };
};