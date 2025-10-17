'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import DashboardLayout from '@/app/components/DashboardLayout'
import { Card } from '@/app/components/ui/Card'
import Button from '@/app/components/ui/Button'
import { Copy, ExternalLink, CheckCircle, CreditCard, Building2 } from 'lucide-react'
import { formatBritishCurrency } from '@/app/lib/utils/british-format'

interface Product {
  id: string
  name: string
  description: string | null
  amount_cents: number
  currency: string
  interval: string | null
  processor: 'stripe' | 'gocardless'
  platform_fee_bps: number | null
  active: boolean
}

function SellPageContent() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [clientEmail, setClientEmail] = useState('')
  const [clientName, setClientName] = useState('')
  const [paymentLink, setPaymentLink] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  useEffect(() => {
    fetchProducts()
  }, [])
  
  useEffect(() => {
    const productId = searchParams.get('product')
    if (productId && products.length > 0) {
      const product = products.find(p => p.id === productId)
      if (product) {
        setSelectedProduct(product)
      }
    }
  }, [searchParams, products])
  
  const fetchProducts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()
      
      if (!userOrg) return
      
      const { data, error } = await supabase
        .from('gym_products')
        .select('*')
        .eq('organization_id', userOrg.organization_id)
        .eq('active', true)
        .order('name')
      
      if (!error && data) {
        setProducts(data)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }
  
  const generatePaymentLink = async () => {
    if (!selectedProduct) return
    
    setLoading(true)
    setPaymentLink('')
    
    try {
      const endpoint = selectedProduct.processor === 'stripe'
        ? '/api/gym/checkout/stripe'
        : '/api/gym/checkout/gocardless'
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          clientEmail,
          clientName,
          mode: selectedProduct.interval ? 'subscription' : 'payment'
        })
      })
      
      const data = await response.json()
      
      if (data.url) {
        setPaymentLink(data.url)
      } else {
        console.error('Failed to generate payment link:', data.error)
      }
    } catch (error) {
      console.error('Error generating payment link:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(paymentLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const getIntervalText = (interval: string | null) => {
    if (!interval) return 'One-time payment'
    switch (interval) {
      case 'day': return 'per day'
      case 'week': return 'per week'
      case 'month': return 'per month'
      case 'year': return 'per year'
      default: return interval
    }
  }
  
  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Generate Payment Link</h2>
            <p className="text-gray-400 mt-1">Create a secure payment link to send to your clients</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product Selection */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">1. Select Product</h3>
              
              {products.length === 0 ? (
                <p className="text-gray-400 text-sm">No active products found</p>
              ) : (
                <div className="space-y-2">
                  {products.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedProduct?.id === product.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium">{product.name}</div>
                          {product.description && (
                            <div className="text-sm text-gray-400 mt-1">{product.description}</div>
                          )}
                        </div>
                        <div className="ml-3 text-right">
                          <div className="font-semibold">
                            {formatBritishCurrency(product.amount_cents / 100)}
                          </div>
                          <div className="text-xs text-gray-400">
                            {getIntervalText(product.interval)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center mt-2 text-xs text-gray-400">
                        {product.processor === 'stripe' ? (
                          <>
                            <CreditCard className="h-3 w-3 mr-1" />
                            Card payment
                          </>
                        ) : (
                          <>
                            <Building2 className="h-3 w-3 mr-1" />
                            Direct debit
                          </>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
            
            {/* Client Details */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">2. Client Details (Optional)</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Client Name</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="John Smith"
                    className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Client Email</label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <p className="text-xs text-gray-400">
                  Pre-filling these details will make checkout faster for your client
                </p>
              </div>
            </Card>
          </div>
          
          {/* Generate Link */}
          <Card className="p-6 mt-6">
            <h3 className="font-semibold mb-4">3. Generate Link</h3>
            
            {!selectedProduct ? (
              <p className="text-gray-400 text-sm">Please select a product first</p>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-gray-800 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">Selected Product</span>
                    <span className="text-sm font-medium">{selectedProduct.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Amount</span>
                    <span className="text-lg font-semibold">
                      {formatBritishCurrency(selectedProduct.amount_cents / 100)}
                      {selectedProduct.interval && (
                        <span className="text-sm text-gray-400 ml-1">
                          {getIntervalText(selectedProduct.interval)}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
                
                <Button 
                  onClick={generatePaymentLink}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Generating...' : 'Generate Payment Link'}
                </Button>
              </div>
            )}
          </Card>
          
          {/* Generated Link */}
          {paymentLink && (
            <Card className="p-6 mt-6 border-green-500/20 bg-green-500/5">
              <div className="flex items-center mb-4">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <h3 className="font-semibold">Payment Link Generated!</h3>
              </div>
              
              <div className="space-y-4">
                <div className="p-3 bg-gray-800 rounded-lg font-mono text-sm break-all">
                  {paymentLink}
                </div>
                
                <div className="flex space-x-3">
                  <Button 
                    onClick={copyToClipboard}
                    variant="ghost"
                    className="flex-1"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {copied ? 'Copied!' : 'Copy Link'}
                  </Button>
                  <Button 
                    onClick={() => window.open(paymentLink, '_blank')}
                    variant="ghost"
                    className="flex-1"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Test Link
                  </Button>
                </div>
                
                <div className="text-sm text-gray-400">
                  <p>Share this link with your client via:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Email or SMS</li>
                    <li>WhatsApp or other messaging apps</li>
                    <li>Add to invoices or booking confirmations</li>
                  </ul>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function SellPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-500">Loading payment links...</div>
        </div>
      </DashboardLayout>
    }>
      <SellPageContent />
    </Suspense>
  )
}