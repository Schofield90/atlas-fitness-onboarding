'use client';

import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { 
  Users, 
  Clock, 
  MapPin, 
  DollarSign, 
  Edit, 
  Trash2, 
  MessageSquare,
  UserPlus,
  Calendar,
  Star,
  Info
} from 'lucide-react';

interface SelectedClassDetailsProps {
  selectedClass: any | null;
}

const SelectedClassDetails: React.FC<SelectedClassDetailsProps> = ({ selectedClass }) => {
  
  if (!selectedClass) {
    return (
      <div className="p-6 h-full flex items-center justify-center" data-testid="selected-class-panel">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Info className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-300 mb-2">No Class Selected</h3>
          <p className="text-sm text-gray-400">
            Click on a class in the calendar to view its details
          </p>
        </div>
      </div>
    );
  }
  
  const start = selectedClass.startTime ? new Date(selectedClass.startTime) : null;
  const end = start && selectedClass.duration ? new Date(start.getTime() + selectedClass.duration * 60000) : null;
  const dateString = start ? start.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }) : '';
  const timeString = start && end
    ? `${start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
    : (selectedClass.time || '');
  const bookings = typeof selectedClass.bookings === 'number' ? selectedClass.bookings : 0;
  const capacity = typeof selectedClass.capacity === 'number' ? selectedClass.capacity : 0;
  const utilizationRate = capacity > 0 ? (bookings / capacity) * 100 : 0;
  
  return (
    <div className="p-6 h-full overflow-y-auto" data-testid="selected-class-panel">
      <div className="space-y-6">
        {/* Class Header */}
        <div>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white" data-testid="selected-class-title">{selectedClass.title}</h2>
              <p className="text-sm text-gray-300" data-testid="selected-class-time">{[dateString, timeString].filter(Boolean).join(' • ')}</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  console.log('Edit class clicked');
                  alert('Edit class modal would open here');
                }}
                title="Edit Class"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this class?')) {
                    console.log('Delete class confirmed');
                    alert('Class would be deleted');
                  }
                }}
                title="Delete Class"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {selectedClass.description && (
            <p className="text-sm text-white opacity-80 mb-4">{selectedClass.description}</p>
          )}
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-700/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-400">Duration</span>
              </div>
              <p className="text-sm font-medium text-white">{selectedClass.duration} mins</p>
            </div>
            
            <div className="bg-gray-700/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-green-400" />
                <span className="text-xs text-slate-400">Earnings</span>
              </div>
              <p className="text-sm font-medium text-green-400">{selectedClass.earnings}</p>
            </div>
            
            {selectedClass.room && (
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-400">Location</span>
                </div>
                <p className="text-sm font-medium text-white">{selectedClass.room}</p>
              </div>
            )}
            
            <div className="bg-gray-700/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-400">Capacity</span>
              </div>
              <p className="text-sm font-medium text-white">
                {selectedClass.bookings}/{selectedClass.capacity}
              </p>
            </div>
          </div>
        </div>
        
        {/* Instructor Info */}
        {(selectedClass.instructor || selectedClass.instructor?.name) && (
        <Card>
          <CardHeader>
            <CardTitle>Instructor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="text-2xl">{selectedClass.instructor?.avatar ?? ''}</div>
              <div className="flex-1">
                <h4 className="font-medium text-white">{selectedClass.instructor?.name ?? selectedClass.instructor}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-current" />
                    <span className="text-xs text-white opacity-70">{selectedClass.instructor?.rating ?? ''}</span>
                  </div>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-white opacity-70">{selectedClass.instructor?.experience ?? ''}</span>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  console.log('Message instructor clicked');
                  alert('Message to instructor would be sent');
                }}
                title="Message Instructor"
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
        )}
        
        {/* Capacity Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Capacity Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white opacity-70">Utilization</span>
                  <span className="text-white font-medium">{utilizationRate.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-gray-900 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${
                      utilizationRate >= 90 ? 'bg-red-500' :
                      utilizationRate >= 80 ? 'bg-amber-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${utilizationRate}%` }}
                  />
                </div>
              </div>
              
              {selectedClass.waitlist > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white opacity-70">Waitlist</span>
                  <Badge variant="warning">{selectedClass.waitlist} waiting</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Equipment */}
        {Array.isArray(selectedClass.equipment) && selectedClass.equipment.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Equipment Needed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selectedClass.equipment.map((item, index) => (
                <Badge key={index} variant="default">
                  {item}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        )}
        
        {/* Recent Attendees */}
        {Array.isArray(selectedClass.attendees) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Attendees ({selectedClass.attendees.length})</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  console.log('Add attendee clicked');
                  alert('Add attendee modal would open');
                }}
                title="Add Attendee"
              >
                <UserPlus className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedClass.attendees.map((attendee, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{attendee.name}</p>
                    <p className="text-xs text-white opacity-60">{attendee.memberType} Member</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={
                        attendee.status === 'checked-in' ? 'success' :
                        attendee.status === 'no-show' ? 'error' :
                        'default'
                      }
                    >
                      {attendee.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        )}
        
        {/* Quick Actions */}
        <div className="space-y-3">
          <Button 
            className="w-full" 
            size="lg"
            onClick={() => {
              console.log('Reschedule class clicked');
              alert('Reschedule modal would open with calendar picker');
            }}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Reschedule Class
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => {
              console.log('Message all attendees clicked');
              alert('Compose message modal would open to send to all 4 attendees');
            }}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Message All Attendees
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => {
              console.log('Manage waitlist clicked');
              alert('Waitlist management modal would open (3 people waiting)');
            }}
          >
            <Users className="w-4 h-4 mr-2" />
            Manage Waitlist
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SelectedClassDetails;