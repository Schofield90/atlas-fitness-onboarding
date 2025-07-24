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
  Star
} from 'lucide-react';

const SelectedClassDetails: React.FC = () => {
  // Mock selected class data
  const selectedClass = {
    id: '1',
    title: 'HIIT Blast',
    instructor: {
      name: 'Sarah Chen',
      avatar: '👩‍💼',
      rating: 4.9,
      experience: '5 years'
    },
    time: '9:00 AM - 9:45 AM',
    date: 'Monday, July 24',
    duration: 45,
    bookings: 18,
    capacity: 20,
    waitlist: 3,
    earnings: '$360',
    room: 'Studio A',
    description: 'High-intensity interval training designed to boost your metabolism and burn calories.',
    equipment: ['Dumbbells', 'Kettlebells', 'Exercise Mats'],
    attendees: [
      { name: 'John Smith', status: 'checked-in', memberType: 'Premium' },
      { name: 'Emma Davis', status: 'booked', memberType: 'Basic' },
      { name: 'Mike Johnson', status: 'booked', memberType: 'Premium' },
      { name: 'Sarah Wilson', status: 'no-show', memberType: 'Trial' }
    ]
  };
  
  const utilizationRate = (selectedClass.bookings / selectedClass.capacity) * 100;
  
  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="space-y-6">
        {/* Class Header */}
        <div>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">{selectedClass.title}</h2>
              <p className="text-sm text-slate-400">{selectedClass.date}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm">
                <Edit className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <p className="text-sm text-slate-300 mb-4">{selectedClass.description}</p>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-400">Duration</span>
              </div>
              <p className="text-sm font-medium text-white">{selectedClass.duration} mins</p>
            </div>
            
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-green-400" />
                <span className="text-xs text-slate-400">Earnings</span>
              </div>
              <p className="text-sm font-medium text-green-400">{selectedClass.earnings}</p>
            </div>
            
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-400">Location</span>
              </div>
              <p className="text-sm font-medium text-white">{selectedClass.room}</p>
            </div>
            
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-400">Capacity</span>
              </div>
              <p className="text-sm font-medium text-white">
                {selectedClass.bookings}/{selectedClass.capacity}
              </p>
            </div>
          </div>
        </div>
        
        {/* Instructor Info */}
        <Card>
          <CardHeader>
            <CardTitle>Instructor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="text-2xl">{selectedClass.instructor.avatar}</div>
              <div className="flex-1">
                <h4 className="font-medium text-white">{selectedClass.instructor.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-current" />
                    <span className="text-xs text-slate-400">{selectedClass.instructor.rating}</span>
                  </div>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-400">{selectedClass.instructor.experience}</span>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <MessageSquare className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Capacity Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Capacity Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Utilization</span>
                  <span className="text-white font-medium">{utilizationRate.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
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
                  <span className="text-sm text-slate-400">Waitlist</span>
                  <Badge variant="warning">{selectedClass.waitlist} waiting</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Equipment */}
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
        
        {/* Recent Attendees */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Attendees ({selectedClass.attendees.length})</CardTitle>
              <Button variant="ghost" size="sm">
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
                    <p className="text-xs text-slate-400">{attendee.memberType} Member</p>
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
        
        {/* Quick Actions */}
        <div className="space-y-3">
          <Button className="w-full" size="lg">
            <Calendar className="w-4 h-4 mr-2" />
            Reschedule Class
          </Button>
          
          <Button variant="outline" className="w-full">
            <MessageSquare className="w-4 h-4 mr-2" />
            Message All Attendees
          </Button>
          
          <Button variant="outline" className="w-full">
            <Users className="w-4 h-4 mr-2" />
            Manage Waitlist
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SelectedClassDetails;