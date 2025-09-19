"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Users, MapPin, DollarSign, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import moment from 'moment';

interface ClassSession {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  session_type: 'gym_class' | 'personal_training' | 'coaching_call';
  trainer_name?: string;
  trainer_id?: string;
  location?: string;
  max_capacity: number;
  current_bookings: number;
  base_cost: number;
  member_cost?: number;
  is_available: boolean;
  notes?: string;
  is_cancelled?: boolean;
}

interface Trainer {
  id: string;
  name: string;
  specialties: string[];
}

interface EditSessionModalProps {
  session: ClassSession;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (session: ClassSession) => void;
}

export function EditSessionModal({ session, isOpen, onClose, onUpdate }: EditSessionModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<ClassSession>(session);
  const [loading, setLoading] = useState(false);
  const [availableTrainers] = useState<Trainer[]>([
    { id: 'trainer-1', name: 'Sarah Johnson', specialties: ['HIIT', 'Cardio', 'Strength'] },
    { id: 'trainer-2', name: 'Emma Wilson', specialties: ['Yoga', 'Pilates', 'Flexibility'] },
    { id: 'trainer-3', name: 'Mike Davis', specialties: ['Personal Training', 'Strength', 'Powerlifting'] },
    { id: 'trainer-4', name: 'John Smith', specialties: ['CrossFit', 'Functional Training', 'HIIT'] },
    { id: 'trainer-5', name: 'Lisa Taylor', specialties: ['Pilates', 'Core', 'Balance'] },
    { id: 'trainer-6', name: 'Alex Brown', specialties: ['Strength Training', 'Bodybuilding', 'Functional'] },
  ]);

  useEffect(() => {
    setFormData(session);
  }, [session]);

  const handleInputChange = (field: keyof ClassSession, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTimeChange = (field: 'start_time' | 'end_time', value: string) => {
    const currentMoment = moment(formData[field]);
    const [hours, minutes] = value.split(':').map(Number);
    const newMoment = currentMoment.clone().hour(hours).minute(minutes);

    setFormData(prev => ({
      ...prev,
      [field]: newMoment.toISOString()
    }));
  };

  const handleDateChange = (value: string) => {
    const newDate = moment(value);
    const startMoment = moment(formData.start_time);
    const endMoment = moment(formData.end_time);

    // Update both start and end times with the new date
    const newStartTime = newDate.clone()
      .hour(startMoment.hour())
      .minute(startMoment.minute())
      .toISOString();

    const newEndTime = newDate.clone()
      .hour(endMoment.hour())
      .minute(endMoment.minute())
      .toISOString();

    setFormData(prev => ({
      ...prev,
      start_time: newStartTime,
      end_time: newEndTime
    }));
  };

  const handleTrainerChange = (trainerId: string) => {
    const trainer = availableTrainers.find(t => t.id === trainerId);
    setFormData(prev => ({
      ...prev,
      trainer_id: trainerId,
      trainer_name: trainer?.name || ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate capacity
      if (formData.max_capacity < formData.current_bookings) {
        toast({
          title: "Invalid Capacity",
          description: `Capacity cannot be less than current bookings (${formData.current_bookings}).`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Validate times
      if (moment(formData.start_time).isAfter(moment(formData.end_time))) {
        toast({
          title: "Invalid Times",
          description: "Start time must be before end time.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      await onUpdate(formData);
    } catch (error) {
      console.error('Error updating session:', error);
      toast({
        title: "Error",
        description: "Failed to update session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData(session); // Reset form data
    onClose();
  };

  const currentDate = moment(formData.start_time).format('YYYY-MM-DD');
  const startTime = moment(formData.start_time).format('HH:mm');
  const endTime = moment(formData.end_time).format('HH:mm');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Edit Session: {session.title}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Session Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Session Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="session_type">Session Type</Label>
              <Select
                value={formData.session_type}
                onValueChange={(value) => handleInputChange('session_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gym_class">Gym Class</SelectItem>
                  <SelectItem value="personal_training">Personal Training</SelectItem>
                  <SelectItem value="coaching_call">Coaching Call</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={currentDate}
                onChange={(e) => handleDateChange(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time</Label>
              <Input
                id="start_time"
                type="time"
                value={startTime}
                onChange={(e) => handleTimeChange('start_time', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_time">End Time</Label>
              <Input
                id="end_time"
                type="time"
                value={endTime}
                onChange={(e) => handleTimeChange('end_time', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Trainer and Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trainer">Trainer</Label>
              <Select
                value={formData.trainer_id || ''}
                onValueChange={handleTrainerChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a trainer" />
                </SelectTrigger>
                <SelectContent>
                  {availableTrainers.map(trainer => (
                    <SelectItem key={trainer.id} value={trainer.id}>
                      <div className="flex flex-col">
                        <span>{trainer.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {trainer.specialties.join(', ')}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location || ''}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="e.g., Studio A, Main Floor"
              />
            </div>
          </div>

          {/* Capacity and Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_capacity">Max Capacity</Label>
              <div className="relative">
                <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="max_capacity"
                  type="number"
                  min="1"
                  value={formData.max_capacity}
                  onChange={(e) => handleInputChange('max_capacity', parseInt(e.target.value))}
                  className="pl-9"
                  required
                />
              </div>
              {formData.max_capacity < formData.current_bookings && (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Cannot be less than current bookings ({formData.current_bookings})</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="base_cost">Base Cost (£)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="base_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.base_cost}
                  onChange={(e) => handleInputChange('base_cost', parseFloat(e.target.value))}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="member_cost">Member Cost (£)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="member_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.member_cost || ''}
                  onChange={(e) => handleInputChange('member_cost', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="pl-9"
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          {/* Current Bookings Info */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Current Bookings</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <Badge variant="outline">
                {formData.current_bookings} / {formData.max_capacity} spots booked
              </Badge>
              <span className="text-muted-foreground">
                {formData.max_capacity - formData.current_bookings} spots available
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Session Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Add any notes about this session..."
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Session'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}