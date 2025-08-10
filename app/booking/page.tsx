'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { MapPin, Clock, Calendar, Users } from 'lucide-react'
import Link from 'next/link'

export default function BookingLandingPage() {
  const locations = [
    {
      city: 'York',
      path: '/booking/york',
      address: '123 High Street, York, YO1 7HY',
      hours: 'Mon-Fri: 6am-10pm, Sat-Sun: 7am-8pm',
      features: ['25+ Classes Weekly', 'Personal Training', 'Swimming Pool', 'Sauna & Steam Room'],
      image: '/images/york-gym.jpg'
    },
    {
      city: 'Harrogate',
      path: '/booking/harrogate',
      address: '456 Kings Road, Harrogate, HG1 5JW',
      hours: 'Mon-Fri: 5:30am-10pm, Sat-Sun: 7am-9pm',
      features: ['30+ Classes Weekly', 'CrossFit Box', 'Yoga Studio', 'Aqua Aerobics'],
      image: '/images/harrogate-gym.jpg'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Book Your Fitness Class</h1>
          <p className="text-xl text-gray-600">
            Choose your location to view and book available classes
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {locations.map((location) => (
            <Card key={location.city} className="hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="text-2xl">Atlas Fitness {location.city}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
                    <p className="text-gray-600">{location.address}</p>
                  </div>
                  
                  <div className="flex items-start">
                    <Clock className="h-5 w-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
                    <p className="text-gray-600">{location.hours}</p>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">Features:</h4>
                    <ul className="space-y-1">
                      {location.features.map((feature, index) => (
                        <li key={index} className="text-gray-600 flex items-center">
                          <span className="text-green-500 mr-2">✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link href={location.path}>
                    <Button className="w-full mt-6" size="lg">
                      View {location.city} Classes
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-8">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-3">New to Atlas Fitness?</h3>
              <p className="text-gray-600 mb-6">
                Get your first class FREE when you sign up for a membership today!
              </p>
              <div className="flex justify-center gap-4">
                <Button variant="outline" size="lg">
                  Learn More
                </Button>
                <Button size="lg">
                  Sign Up Now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-12 text-center">
          <h3 className="text-lg font-semibold mb-4">Need Help?</h3>
          <div className="flex justify-center gap-8">
            <a href="tel:01904123456" className="flex items-center text-gray-600 hover:text-blue-600">
              <span className="mr-2">📞</span>
              York: 01904 123456
            </a>
            <a href="tel:01423567890" className="flex items-center text-gray-600 hover:text-blue-600">
              <span className="mr-2">📞</span>
              Harrogate: 01423 567890
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}