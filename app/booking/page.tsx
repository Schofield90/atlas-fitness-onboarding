'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import BookingDemo from '@/app/components/booking/BookingDemo';
import DashboardLayout from '@/app/components/DashboardLayout';

export default function BookingPage() {
  const router = useRouter();

  const handleSignupClick = () => {
    router.push('/signup');
  };

  return (
    <DashboardLayout userData={null}>
      <div className="h-full flex flex-col">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Class Booking</h1>
          <p className="text-gray-300">Interactive demo - See how our booking system works</p>
        </div>

        <BookingDemo onSignupClick={handleSignupClick} />
      </div>
    </DashboardLayout>
  );
}