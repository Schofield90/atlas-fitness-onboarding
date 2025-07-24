'use client';

import React from 'react';
import { FileDown, Plus } from 'lucide-react';
import Button from '@/app/components/ui/Button';
import QuickStat from '@/app/components/booking/QuickStat';
import ClassTypeFilter from '@/app/components/booking/ClassTypeFilter';
import InstructorFilter from '@/app/components/booking/InstructorFilter';
import TimeRangeFilter from '@/app/components/booking/TimeRangeFilter';
import CalendarViewToggle from '@/app/components/booking/CalendarViewToggle';
import PremiumCalendarGrid from '@/app/components/booking/PremiumCalendarGrid';
import SelectedClassDetails from '@/app/components/booking/SelectedClassDetails';

export default function BookingManagement() {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Top Action Bar */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Class Schedule</h1>
            <p className="text-sm text-slate-400">Manage your gym's classes and bookings</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-slate-700">
              <FileDown className="w-4 h-4 mr-2" />
              Export Schedule
            </Button>
            <Button className="bg-orange-600 hover:bg-orange-700 shadow-lg">
              <Plus className="w-4 h-4 mr-2" />
              Add Class
            </Button>
          </div>
        </div>
        
        {/* Quick Stats Bar */}
        <div className="grid grid-cols-4 gap-6 px-6 pb-4">
          <QuickStat 
            label="Today's Classes" 
            value="12" 
            change="+2 from last week"
            trend="up"
          />
          <QuickStat 
            label="Total Bookings" 
            value="284" 
            change="+15% this week"
            trend="up"
          />
          <QuickStat 
            label="Capacity" 
            value="78%" 
            change="+5% from average"
            trend="up"
          />
          <QuickStat 
            label="Revenue Today" 
            value="$1,240" 
            change="+$180 from yesterday"
            trend="up"
          />
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex h-[calc(100vh-180px)]">
        {/* Left Sidebar - Class Types & Filters */}
        <div className="w-64 border-r border-slate-800 bg-slate-900/30 p-4 overflow-y-auto">
          <ClassTypeFilter />
          <InstructorFilter />
          <TimeRangeFilter />
        </div>
        
        {/* Calendar/Schedule View */}
        <div className="flex-1 p-6 overflow-hidden">
          <CalendarViewToggle />
          <div className="h-[calc(100%-80px)] overflow-auto">
            <PremiumCalendarGrid />
          </div>
        </div>
        
        {/* Right Sidebar - Selected Class Details */}
        <div className="w-96 border-l border-slate-800 bg-slate-900/30 overflow-hidden">
          <SelectedClassDetails />
        </div>
      </div>
      
      {/* Background Pattern */}
      <div className="fixed inset-0 -z-10 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(148 163 184) 1px, transparent 0)`,
          backgroundSize: '50px 50px'
        }} />
      </div>
    </div>
  );
}