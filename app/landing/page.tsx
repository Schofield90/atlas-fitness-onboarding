"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Users,
  MessageSquare,
  Brain,
  Calendar,
  TrendingUp,
  Phone,
  ChefHat,
  Dumbbell,
  Activity,
  CreditCard,
  BarChart3,
  Zap,
  CheckCircle,
  Star,
  ArrowRight,
  Clock,
  Shield,
  Globe,
  Menu,
  X,
} from "lucide-react";
import { TRIAL_CTA_TEXT } from "@/app/lib/constants";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    {
      icon: <Brain className="h-8 w-8" />,
      title: "AI-Powered Lead Scoring",
      description:
        "Automatically qualify and prioritize leads based on engagement and buying signals using advanced AI",
    },
    {
      icon: <MessageSquare className="h-8 w-8" />,
      title: "Omnichannel Communication",
      description:
        "WhatsApp, SMS, Email, and Voice - reach your leads instantly on their preferred channels",
    },
    {
      icon: <Calendar className="h-8 w-8" />,
      title: "Smart Booking System",
      description:
        "Automated scheduling with Google Calendar sync, waitlists, and intelligent time slot management",
    },
    {
      icon: <ChefHat className="h-8 w-8" />,
      title: "AI Nutrition Coach",
      description:
        "Personalized meal plans, macro tracking, and real-time coaching powered by GPT-4",
    },
    {
      icon: <Dumbbell className="h-8 w-8" />,
      title: "Workout Programming",
      description:
        "Custom workout plans with progress tracking and automated adjustments based on performance",
    },
    {
      icon: <CreditCard className="h-8 w-8" />,
      title: "Integrated Payments",
      description:
        "Stripe Connect for seamless payments, recurring memberships, and automated billing",
    },
  ];

  const benefits = [
    {
      stat: "68%",
      label: "Increase in Lead Conversion",
      description:
        "AI-powered lead nurturing converts more prospects into paying members",
    },
    {
      stat: "24/7",
      label: "Always-On Lead Response",
      description:
        "Never miss a lead with automated instant responses any time of day",
    },
    {
      stat: "3x",
      label: "Faster Response Time",
      description:
        "Beat your competition by responding to leads in seconds, not hours",
    },
    {
      stat: "45%",
      label: "Reduction in Admin Time",
      description:
        "Automate repetitive tasks and focus on what matters - your members",
    },
  ];

  const integrations = [
    "WhatsApp Business",
    "Twilio",
    "Stripe",
    "Google Calendar",
    "Facebook Ads",
    "Instagram",
    "Mailgun",
    "OpenAI GPT-4",
  ];

  const testimonials = [
    {
      name: "Sarah Mitchell",
      role: "Owner, FitLife Gym",
      content:
        "Atlas transformed how we handle leads. We've doubled our conversion rate and saved hours every day on admin work.",
      rating: 5,
    },
    {
      name: "Marcus Chen",
      role: "Head Coach, Elite Training",
      content:
        "The AI nutrition coach alone is worth it. Our members love the personalized meal plans and we love the automated coaching.",
      rating: 5,
    },
    {
      name: "Emma Rodriguez",
      role: "Manager, CrossFit North",
      content:
        "Finally, a CRM that actually understands the fitness industry. The booking system and class management are game-changers.",
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Header */}
      <header className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Activity className="h-8 w-8 text-orange-500" />
            <span className="text-2xl font-bold">Atlas Fitness</span>
          </div>
          <nav className="flex items-center gap-x-6">
            <div className="hidden md:flex items-center gap-x-8">
              <a
                href="#features"
                aria-label="Features"
                className="hover:text-orange-400 transition-colors"
              >
                Features
              </a>
              <a
                href="#benefits"
                aria-label="Benefits"
                className="hover:text-orange-400 transition-colors"
              >
                Benefits
              </a>
              <a
                href="#testimonials"
                aria-label="Testimonials"
                className="hover:text-orange-400 transition-colors"
              >
                Testimonials
              </a>
              <a
                href="#pricing"
                aria-label="Pricing"
                className="hover:text-orange-400 transition-colors"
              >
                Pricing
              </a>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors border border-gray-600"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors"
              >
                {TRIAL_CTA_TEXT}
              </Link>
              <button
                type="button"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
                className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-orange-500"
                onClick={() => setMobileMenuOpen((v) => !v)}
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </nav>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden mt-4">
            <div className="flex flex-col space-y-2 rounded-lg border border-gray-700 bg-gray-900/80 p-3">
              <a
                href="#features"
                aria-label="Features"
                className="block w-full rounded-md px-3 py-2 hover:bg-gray-800"
              >
                Features
              </a>
              <a
                href="#benefits"
                aria-label="Benefits"
                className="block w-full rounded-md px-3 py-2 hover:bg-gray-800"
              >
                Benefits
              </a>
              <a
                href="#testimonials"
                aria-label="Testimonials"
                className="block w-full rounded-md px-3 py-2 hover:bg-gray-800"
              >
                Testimonials
              </a>
              <a
                href="#pricing"
                aria-label="Pricing"
                className="block w-full rounded-md px-3 py-2 hover:bg-gray-800"
              >
                Pricing
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-16">
        <div className="text-center max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-orange-500/20 text-orange-400 px-4 py-2 rounded-full mb-6">
            <Zap className="h-4 w-4" />
            <span className="text-sm font-medium">
              AI-Powered Gym Management Platform
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
            Turn Every Lead Into a{" "}
            <span className="text-orange-500">Loyal Member</span>
          </h1>

          <p className="text-xl md:text-2xl mb-12 text-gray-300 leading-relaxed max-w-3xl mx-auto">
            The complete AI-powered platform for modern gyms. Capture leads,
            automate nurturing, manage memberships, and deliver personalized
            coaching - all in one place.
          </p>

          <div className="flex flex-col md:flex-row gap-6 justify-center items-center mb-16">
            <Link
              href="/signup"
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
            >
              {TRIAL_CTA_TEXT}
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/demo"
              className="border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white font-bold py-4 px-8 rounded-lg text-lg transition-all flex items-center gap-2"
            >
              <Phone className="h-5 w-5" />
              Book a Demo
            </Link>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center items-center gap-8 mb-16">
            <div className="flex items-center gap-2 text-gray-400">
              <Shield className="h-5 w-5" />
              <span className="text-sm">SOC 2 Compliant</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Globe className="h-5 w-5" />
              <span className="text-sm">500+ Gyms Worldwide</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Clock className="h-5 w-5" />
              <span className="text-sm">99.9% Uptime</span>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <section id="features" className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Everything You Need to Grow Your Gym
            </h2>
            <p className="text-xl text-gray-400">
              Powerful features designed specifically for fitness businesses
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 hover:bg-gray-800/70 transition-all"
              >
                <div className="text-orange-500 mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Benefits Section */}
        <section id="benefits" className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Real Results for Real Gyms
            </h2>
            <p className="text-xl text-gray-400">
              Join hundreds of gyms seeing incredible growth
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="text-5xl font-bold text-orange-500 mb-2">
                  {benefit.stat}
                </div>
                <div className="text-lg font-semibold mb-2">
                  {benefit.label}
                </div>
                <p className="text-gray-400 text-sm">{benefit.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Loved by Gym Owners Worldwide
            </h2>
            <p className="text-xl text-gray-400">
              See what our customers have to say
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6"
              >
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-5 w-5 text-yellow-500 fill-current"
                    />
                  ))}
                </div>
                <p className="text-gray-300 mb-4 italic">
                  "{testimonial.content}"
                </p>
                <div>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-gray-400">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Integrations Section */}
        <section className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Seamlessly Integrated</h2>
            <p className="text-xl text-gray-400">
              Works with all your favorite tools
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-6">
            {integrations.map((integration, index) => (
              <div
                key={index}
                className="bg-gray-800/50 backdrop-blur-sm rounded-lg px-6 py-3"
              >
                <span className="text-gray-300">{integration}</span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="bg-gradient-to-r from-orange-600 to-orange-500 rounded-2xl p-12 text-center">
            <h2 className="text-4xl font-bold mb-4">
              Ready to Transform Your Gym?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join 500+ gyms using Atlas to grow their business
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="bg-gray-900 text-orange-500 hover:bg-gray-800 border border-gray-700 font-bold py-4 px-8 rounded-lg text-lg transition-all"
              >
                {TRIAL_CTA_TEXT}
              </Link>
              <Link
                href="/contact"
                className="border-2 border-gray-800 text-white hover:bg-gray-800 hover:text-orange-500 font-bold py-4 px-8 rounded-lg text-lg transition-all"
              >
                Talk to Sales
              </Link>
            </div>
            <p className="mt-6 text-sm opacity-75">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Activity className="h-6 w-6 text-orange-500" />
                <span className="text-xl font-bold">Atlas Fitness</span>
              </div>
              <p className="text-gray-400 text-sm">
                The complete AI-powered platform for modern gyms
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>
                  <Link href="/features" className="hover:text-white">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-white">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/integrations" className="hover:text-white">
                    Integrations
                  </Link>
                </li>
                <li>
                  <Link href="/roadmap" className="hover:text-white">
                    Roadmap
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>
                  <Link href="/about" className="hover:text-white">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="hover:text-white">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="/careers" className="hover:text-white">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-white">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>
                  <Link href="/help" className="hover:text-white">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/docs" className="hover:text-white">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="/api" className="hover:text-white">
                    API Reference
                  </Link>
                </li>
                <li>
                  <Link href="/status" className="hover:text-white">
                    System Status
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400 text-sm">
            <p>&copy; 2025 Atlas Fitness. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
