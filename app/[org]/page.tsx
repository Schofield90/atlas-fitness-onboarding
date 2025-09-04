import { notFound } from 'next/navigation'
import { createAdminClient } from '@/app/lib/supabase/admin'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Phone, Mail, Clock, Users, Activity, Calendar } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ org: string }>
}

export default async function OrganizationLandingPage({ params }: PageProps) {
  const { org: orgSlug } = await params
  const adminSupabase = createAdminClient()
  
  // Fetch organization by slug or name
  const { data: organization } = await adminSupabase
    .from('organizations')
    .select(`
      *,
      organization_settings (*)
    `)
    .or(`slug.eq.${orgSlug},name.ilike.${orgSlug.replace('-', ' ')}`)
    .single()

  if (!organization) {
    notFound()
  }

  // Fetch additional organization data
  const [
    { data: locations },
    { data: classTypes },
    { data: programs },
    { data: staff }
  ] = await Promise.all([
    adminSupabase
      .from('locations')
      .select('*')
      .eq('organization_id', organization.id)
      .eq('is_active', true),
    adminSupabase
      .from('class_types')
      .select('*')
      .eq('organization_id', organization.id)
      .limit(6),
    adminSupabase
      .from('programs')
      .select('*')
      .eq('organization_id', organization.id)
      .eq('is_active', true),
    adminSupabase
      .from('organization_staff')
      .select('*')
      .eq('organization_id', organization.id)
      .eq('is_featured', true)
      .limit(4)
  ])

  const settings = organization.organization_settings?.[0] || {}

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              {organization.logo_url ? (
                <Image
                  src={organization.logo_url}
                  alt={organization.name}
                  width={150}
                  height={40}
                  className="h-10 w-auto"
                />
              ) : (
                <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
              )}
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#classes" className="text-gray-700 hover:text-gray-900">Classes</a>
              <a href="#membership" className="text-gray-700 hover:text-gray-900">Membership</a>
              <a href="#trainers" className="text-gray-700 hover:text-gray-900">Trainers</a>
              <a href="#contact" className="text-gray-700 hover:text-gray-900">Contact</a>
            </nav>
            <div className="flex items-center space-x-4">
              <Link
                href="/client-portal/login"
                className="text-gray-700 hover:text-gray-900 font-medium"
              >
                Member Login
              </Link>
              <Link
                href={`/${orgSlug}/join`}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Join Now
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gray-900 text-white">
        <div className="absolute inset-0 overflow-hidden">
          {organization.hero_image_url && (
            <Image
              src={organization.hero_image_url}
              alt={`${organization.name} gym`}
              fill
              className="object-cover opacity-40"
            />
          )}
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              {organization.tagline || `Welcome to ${organization.name}`}
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-200">
              {organization.description || 'Transform your fitness journey with our expert trainers and state-of-the-art facilities.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href={`/${orgSlug}/free-trial`}
                className="bg-white text-gray-900 px-8 py-4 rounded-md font-semibold hover:bg-gray-100 text-center"
              >
                Start 14-Day Free Trial
              </Link>
              <Link
                href="#classes"
                className="border-2 border-white text-white px-8 py-4 rounded-md font-semibold hover:bg-white hover:text-gray-900 text-center"
              >
                View Classes
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Expert Trainers</h3>
              <p className="text-gray-600">
                Certified professionals dedicated to helping you achieve your goals
              </p>
            </div>
            <div className="text-center">
              <Activity className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Modern Equipment</h3>
              <p className="text-gray-600">
                State-of-the-art facilities with the latest fitness technology
              </p>
            </div>
            <div className="text-center">
              <Calendar className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Flexible Classes</h3>
              <p className="text-gray-600">
                Wide range of classes to fit your schedule and fitness level
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Classes Section */}
      {classTypes && classTypes.length > 0 && (
        <section id="classes" className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12">Our Classes</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {classTypes.map((classType) => (
                <div key={classType.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <div 
                    className="h-4 w-full"
                    style={{ backgroundColor: classType.color || '#3B82F6' }}
                  />
                  <div className="p-6">
                    <h3 className="text-xl font-semibold mb-2">{classType.name}</h3>
                    <p className="text-gray-600 mb-4">{classType.description}</p>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>{classType.duration} mins</span>
                      <span>Max {classType.max_capacity} people</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link
                href={`/${orgSlug}/schedule`}
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                View Full Schedule →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Membership Section */}
      {programs && programs.length > 0 && (
        <section id="membership" className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12">Membership Options</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {programs.map((program) => (
                <div key={program.id} className="bg-white rounded-lg shadow-lg p-8">
                  <h3 className="text-2xl font-semibold mb-2">{program.name}</h3>
                  <p className="text-gray-600 mb-6">{program.description}</p>
                  <div className="text-3xl font-bold mb-6">
                    £{(program.price_pennies / 100).toFixed(0)}
                    <span className="text-lg font-normal text-gray-600">/month</span>
                  </div>
                  <Link
                    href={`/${orgSlug}/join?program=${program.id}`}
                    className="block text-center bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700"
                  >
                    Choose Plan
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Trainers Section */}
      {staff && staff.length > 0 && (
        <section id="trainers" className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12">Meet Our Trainers</h2>
            <div className="grid md:grid-cols-4 gap-8">
              {staff.map((member) => (
                <div key={member.id} className="text-center">
                  {member.photo_url ? (
                    <Image
                      src={member.photo_url}
                      alt={member.name}
                      width={200}
                      height={200}
                      className="rounded-full mx-auto mb-4"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto mb-4" />
                  )}
                  <h4 className="text-lg font-semibold">{member.name}</h4>
                  <p className="text-gray-600">{member.role}</p>
                  {member.specialties && (
                    <p className="text-sm text-gray-500 mt-2">{member.specialties.join(', ')}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact Section */}
      <section id="contact" className="py-16 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Get In Touch</h2>
          
          {locations && locations.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {locations.map((location) => (
                <div key={location.id} className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-4">{location.name}</h3>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
                      <p>{location.address}</p>
                    </div>
                    {location.phone && (
                      <div className="flex items-center">
                        <Phone className="h-5 w-5 text-blue-400 mr-3" />
                        <a href={`tel:${location.phone}`} className="hover:text-blue-400">
                          {location.phone}
                        </a>
                      </div>
                    )}
                    {location.opening_hours && (
                      <div className="flex items-start">
                        <Clock className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold mb-1">Opening Hours</p>
                          <pre className="text-sm text-gray-300">{location.opening_hours}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center mb-8">
              <div className="flex items-center justify-center space-x-6">
                {organization.phone && (
                  <a href={`tel:${organization.phone}`} className="flex items-center hover:text-blue-400">
                    <Phone className="h-5 w-5 mr-2" />
                    {organization.phone}
                  </a>
                )}
                {organization.email && (
                  <a href={`mailto:${organization.email}`} className="flex items-center hover:text-blue-400">
                    <Mail className="h-5 w-5 mr-2" />
                    {organization.email}
                  </a>
                )}
              </div>
              {organization.address && (
                <p className="mt-4 text-gray-300">
                  <MapPin className="inline h-4 w-4 mr-2" />
                  {organization.address}
                </p>
              )}
            </div>
          )}

          <div className="text-center">
            <Link
              href={`/${orgSlug}/contact`}
              className="bg-blue-600 text-white px-8 py-3 rounded-md font-semibold hover:bg-blue-700 inline-block"
            >
              Send Us a Message
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400">
              © {new Date().getFullYear()} {organization.name}. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/privacy" className="text-gray-400 hover:text-white">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-white">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Generate static params for known organizations
export async function generateStaticParams() {
  // Avoid requiring service role at build time. If missing, return no prebuilt params.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return []
  }
  try {
    const adminSupabase = createAdminClient()
    const { data: organizations } = await adminSupabase
      .from('organizations')
      .select('slug, name')
      .limit(100)

    return (organizations || []).map((org) => ({
      org: org.slug || org.name.toLowerCase().replace(/\s+/g, '-')
    }))
  } catch {
    return []
  }
}