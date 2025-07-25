import React, { useState } from 'react';
import { X } from 'lucide-react';
import Button from '../ui/Button';

interface AddClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (classData: any) => void;
}

const AddClassModal: React.FC<AddClassModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    title: '',
    instructor: '',
    instructorPhone: '',
    date: '',
    startTime: '',
    duration: 60,
    capacity: 20,
    room: 'Studio A',
    price: 20,
    description: '',
    type: 'hiit',
    enableReminders: true
  });

  const classTypes = [
    { id: 'hiit', name: 'HIIT', color: 'orange' },
    { id: 'yoga', name: 'Yoga', color: 'purple' },
    { id: 'strength', name: 'Strength', color: 'blue' },
    { id: 'cardio', name: 'Cardio', color: 'green' },
    { id: 'pilates', name: 'Pilates', color: 'pink' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create class data
    const newClass = {
      ...formData,
      id: Date.now().toString(),
      bookings: 0,
      earnings: `$0`,
      color: classTypes.find(t => t.id === formData.type)?.color || 'orange'
    };
    
    onAdd(newClass);
    
    // Reset form
    setFormData({
      title: '',
      instructor: '',
      date: '',
      startTime: '',
      duration: 60,
      capacity: 20,
      room: 'Studio A',
      price: 20,
      description: '',
      type: 'hiit'
    });
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Add New Class</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Class Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Class Type
            </label>
            <div className="grid grid-cols-5 gap-3">
              {classTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: type.id })}
                  className={`
                    p-3 rounded-lg border-2 transition-all
                    ${formData.type === type.id
                      ? 'border-orange-500 bg-orange-500/20 text-white'
                      : 'border-gray-600 hover:border-gray-500 text-gray-400'
                    }
                  `}
                >
                  {type.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Class Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
              placeholder="e.g., Morning HIIT Blast"
              required
            />
          </div>
          
          {/* Instructor */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Instructor Name
              </label>
              <input
                type="text"
                value={formData.instructor}
                onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                placeholder="e.g., Sarah Chen"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Instructor Phone (optional)
              </label>
              <input
                type="tel"
                value={formData.instructorPhone}
                onChange={(e) => setFormData({ ...formData, instructorPhone: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                placeholder="e.g., +1234567890"
              />
            </div>
          </div>
          
          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                required
              />
            </div>
          </div>
          
          {/* Duration and Capacity */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                min="15"
                max="180"
                step="15"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Capacity
              </label>
              <input
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                min="1"
                max="50"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Price ($)
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                min="0"
                step="5"
                required
              />
            </div>
          </div>
          
          {/* Room */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Room/Location
            </label>
            <select
              value={formData.room}
              onChange={(e) => setFormData({ ...formData, room: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
            >
              <option value="Studio A">Studio A</option>
              <option value="Studio B">Studio B</option>
              <option value="Gym Floor">Gym Floor</option>
              <option value="Pool">Pool</option>
              <option value="Outdoor">Outdoor</option>
            </select>
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
              rows={3}
              placeholder="Brief description of the class..."
            />
          </div>
          
          {/* WhatsApp Notifications */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.enableReminders}
                onChange={(e) => setFormData({ ...formData, enableReminders: e.target.checked })}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-orange-600 focus:ring-orange-500"
              />
              <div>
                <span className="font-medium text-white">Enable WhatsApp Reminders</span>
                <p className="text-xs text-gray-400 mt-1">
                  Send automatic reminders to participants 2 hours before class
                </p>
              </div>
            </label>
          </div>
        </form>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Add Class
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddClassModal;