'use client';

import React from 'react';
import moment from 'moment';
import { X } from 'lucide-react';

interface ClassBookingModalProps {
  classData: any;
  onBook: () => void;
  onClose: () => void;
}

const ClassBookingModal: React.FC<ClassBookingModalProps> = ({ 
  classData, 
  onBook, 
  onClose 
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-semibold">{classData.program_name}</h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Date</p>
              <p className="font-medium">
                {moment(classData.start_time).format('dddd, MMMM Do YYYY')}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Time</p>
              <p className="font-medium">
                {moment(classData.start_time).format('h:mm A')} - {moment(classData.end_time).format('h:mm A')}
              </p>
            </div>
            
            {classData.trainer_name && (
              <div>
                <p className="text-sm text-gray-600">Trainer</p>
                <p className="font-medium">{classData.trainer_name}</p>
              </div>
            )}
            
            <div>
              <p className="text-sm text-gray-600">Location</p>
              <p className="font-medium">{classData.room_location || 'Main Studio'}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Availability</p>
              <p className="font-medium">
                {classData.spaces_available > 0 
                  ? `${classData.spaces_available} spaces available`
                  : 'Class is full'}
              </p>
              {classData.waitlist_count > 0 && (
                <p className="text-sm text-gray-500">
                  {classData.waitlist_count} people on waitlist
                </p>
              )}
            </div>
            
            {classData.price_pennies && classData.price_pennies > 0 && (
              <div>
                <p className="text-sm text-gray-600">Price</p>
                <p className="font-medium">£{(classData.price_pennies / 100).toFixed(2)}</p>
              </div>
            )}
            
            {classData.description && (
              <div>
                <p className="text-sm text-gray-600">Description</p>
                <p className="text-gray-700">{classData.description}</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end gap-3 p-6 border-t">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button 
            onClick={onBook} 
            className={`px-4 py-2 rounded-lg text-white font-medium ${
              classData.spaces_available === 0 && classData.waitlist_count >= 10
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            disabled={classData.spaces_available === 0 && classData.waitlist_count >= 10}
          >
            {classData.spaces_available > 0 ? 'Book Class' : 'Join Waitlist'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClassBookingModal;