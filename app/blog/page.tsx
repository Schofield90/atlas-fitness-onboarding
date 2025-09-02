'use client'

import Link from 'next/link'
import { ArrowLeft, Calendar } from 'lucide-react'

export default function BlogPage() {
  const posts = [
    {
      title: '10 Ways AI is Transforming Gym Management',
      excerpt: 'Discover how artificial intelligence is revolutionizing the fitness industry...',
      date: '2025-01-15',
      readTime: '5 min read'
    },
    {
      title: 'The Complete Guide to Member Retention',
      excerpt: 'Learn proven strategies to keep your members engaged and committed...',
      date: '2025-01-10',
      readTime: '8 min read'
    },
    {
      title: 'Maximizing Your Gym\'s Social Media Presence',
      excerpt: 'Tips and tricks for building a strong online community...',
      date: '2025-01-05',
      readTime: '6 min read'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-6 py-12">
        <Link href="/landing" className="inline-flex items-center text-gray-400 hover:text-white mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Blog</h1>
          <p className="text-xl text-gray-300">Insights and tips for growing your fitness business</p>
        </div>
        
        <div className="max-w-4xl mx-auto space-y-8">
          {posts.map((post) => (
            <article key={post.title} className="bg-gray-800 rounded-lg p-8">
              <h2 className="text-2xl font-bold mb-2 hover:text-orange-500 cursor-pointer">
                {post.title}
              </h2>
              <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {post.date}
                </span>
                <span>{post.readTime}</span>
              </div>
              <p className="text-gray-300">{post.excerpt}</p>
              <a href="#" className="text-orange-500 hover:text-orange-400 mt-4 inline-block">
                Read more →
              </a>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}