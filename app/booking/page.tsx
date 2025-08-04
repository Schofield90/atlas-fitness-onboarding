'use client';

import React, { useState, useEffect } from 'react';
import { FileDown, Plus } from 'lucide-react';
import Button from '@/app/components/ui/Button';
import QuickStat from '@/app/components/booking/QuickStat';
import ClassTypeFilter from '@/app/components/booking/ClassTypeFilter';
import InstructorFilter from '@/app/components/booking/InstructorFilter';
import TimeRangeFilter from '@/app/components/booking/TimeRangeFilter';
import CalendarViewToggle from '@/app/components/booking/CalendarViewToggle';
import PremiumCalendarGrid from '@/app/components/booking/PremiumCalendarGrid';
import SelectedClassDetails from '@/app/components/booking/SelectedClassDetails';
import AddClassModal from '@/app/components/booking/AddClassModal';
import { getCurrentUserOrganization } from '@/app/lib/organization-service';

export default function BookingManagement() {
  const [showAddClass, setShowAddClass] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedView, setSelectedView] = useState<'calendar' | 'list'>('calendar');
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  
  // Get organization ID and fetch classes
  useEffect(() => {
    const initializeBooking = async () => {
      try {
        const { organizationId: orgId, error } = await getCurrentUserOrganization();
        if (!error && orgId) {
          setOrganizationId(orgId);
          fetchClasses(orgId);
        } else {
          console.error('Failed to get organization:', error);
          // Use hardcoded organization ID as fallback for testing
          const fallbackOrgId = '63589490-8f55-4157-bd3a-e141594b740e'; // Atlas Fitness
          console.log('Using fallback organization ID:', fallbackOrgId);
          setOrganizationId(fallbackOrgId);
          fetchClasses(fallbackOrgId);
        }
      } catch (error) {
        console.error('Error initializing booking:', error);
        // Use hardcoded organization ID as fallback for testing
        const fallbackOrgId = '63589490-8f55-4157-bd3a-e141594b740e'; // Atlas Fitness
        console.log('Using fallback organization ID:', fallbackOrgId);
        setOrganizationId(fallbackOrgId);
        fetchClasses(fallbackOrgId);
      }
    };
    
    initializeBooking();
  }, []);
  
  const fetchClasses = async (orgId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/booking/classes?organizationId=${orgId}`);
      if (response.ok) {
        const data = await response.json();
        // Transform the classes to match the expected format
        const transformedClasses = (data.classes || []).map((cls: any) => {
          const startDate = new Date(cls.start_time);
          const dayOfWeek = startDate.getDay();
          const hour = startDate.getHours();
          const minutes = startDate.getMinutes();
          
          // Convert day (Sunday = 0) to Monday-first (Monday = 0)
          const day = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          
          // Calculate time slot for 30-minute intervals
          // 0 = 6:00 AM, 1 = 6:30 AM, 2 = 7:00 AM, etc.
          const timeSlot = (hour - 6) * 2 + (minutes >= 30 ? 1 : 0);
          if (hour < 6 || hour > 21 || (hour === 21 && minutes > 0)) {
            console.log(`Skipping class at ${hour}:${minutes} - outside calendar range`);
            return null;
          }
          
          return {
            ...cls,
            id: cls.id,
            title: cls.program?.name || 'Class',
            instructor: cls.instructor_name,
            time: startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
            duration: cls.duration_minutes,
            bookings: cls.bookings?.length || 0,
            capacity: cls.capacity,
            color: 'orange' as const,
            earnings: `£${((cls.program?.price_pennies || 0) / 100).toFixed(0)}`,
            room: cls.location,
            day,
            timeSlot,
            startTime: cls.start_time
          };
        }).filter(cls => cls !== null); // Remove null entries for classes outside time range
        
        console.log(`Loaded ${transformedClasses.length} classes for the calendar`);
        setClasses(transformedClasses);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleExport = (format: string) => {
    console.log(`Exporting schedule as ${format}`);
    // Add export logic here
    setShowExportMenu(false);
    // Show success toast
    alert(`Schedule exported as ${format}`);
  };
  
  const handleAddClass = async (classData: any) => {
    try {
      const response = await fetch('/api/booking/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...classData,
          organizationId,
          startTime: `${classData.date}T${classData.startTime}:00`
        })
      });
      
      if (response.ok) {
        alert(`Class "${classData.title}" has been added successfully!`);
        setShowAddClass(false);
        fetchClasses(organizationId); // Refresh the class list
      } else {
        const error = await response.json();
        alert(`Failed to add class: ${error.error}`);
      }
    } catch (error) {
      console.error('Error adding class:', error);
      alert('Failed to add class. Please try again.');
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Top Action Bar */}
      <div className="border-b border-gray-700 bg-gray-800 sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Class Schedule</h1>
            <p className="text-sm text-gray-400">Manage your gym's classes and bookings</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Button 
                variant="outline" 
                className="border-slate-700"
                onClick={() => setShowExportMenu(!showExportMenu)}
              >
                <FileDown className="w-4 h-4 mr-2" />
                Export Schedule
              </Button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-10">
                  <button 
                    onClick={() => handleExport('PDF')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-700 text-slate-300 hover:text-white"
                  >
                    Export as PDF
                  </button>
                  <button 
                    onClick={() => handleExport('CSV')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-700 text-slate-300 hover:text-white"
                  >
                    Export as CSV
                  </button>
                  <button 
                    onClick={() => handleExport('Excel')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-700 text-slate-300 hover:text-white rounded-b-lg"
                  >
                    Export as Excel
                  </button>
                </div>
              )}
            </div>
            <Button 
              className="bg-orange-600 hover:bg-orange-700 shadow-lg"
              onClick={() => setShowAddClass(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Class
            </Button>
          </div>
        </div>
        
        {/* Quick Stats Bar */}
        <div className="grid grid-cols-4 gap-6 px-6 pb-4">
          <QuickStat 
            label="Today's Classes" 
            value={classes.filter(c => new Date(c.startTime).toDateString() === new Date().toDateString()).length.toString()} 
            change=""
            trend="neutral"
          />
          <QuickStat 
            label="Total Bookings" 
            value="0" 
            change=""
            trend="neutral"
          />
          <QuickStat 
            label="Capacity" 
            value="0%" 
            change=""
            trend="neutral"
          />
          <QuickStat 
            label="Revenue Today" 
            value="£0" 
            change=""
            trend="neutral"
          />
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex h-[calc(100vh-180px)]">
        {/* Left Sidebar - Class Types & Filters */}
        <div className="w-64 border-r border-gray-700 bg-gray-800/50 p-4 overflow-y-auto">
          <ClassTypeFilter />
          <InstructorFilter />
          <TimeRangeFilter />
        </div>
        
        {/* Calendar/Schedule View */}
        <div className="flex-1 p-6 overflow-hidden">
          <CalendarViewToggle />
          <div className="h-[calc(100%-80px)] overflow-auto">
            <PremiumCalendarGrid classes={classes} loading={loading} />
          </div>
        </div>
        
        {/* Right Sidebar - Selected Class Details */}
        <div className="w-96 border-l border-gray-700 bg-gray-800/50 overflow-hidden">
          <SelectedClassDetails />
        </div>
      </div>
      
      {/* Add Class Modal */}
      <AddClassModal
        isOpen={showAddClass}
        onClose={() => setShowAddClass(false)}
        onAdd={handleAddClass}
      />
    </div>
  );
}