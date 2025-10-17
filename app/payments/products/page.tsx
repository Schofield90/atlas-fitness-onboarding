'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/app/components/DashboardLayout'
import { Card } from '@/app/components/ui/Card'
import Button from '@/app/components/ui/Button'
import { Plus, Edit, Trash2, Link, CreditCard, Building2 } from 'lucide-react'
import { formatBritishCurrency } from '@/lib/utils/british-format'

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
  created_at: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const router = useRouter()
  const supabase = createClient()
  
  useEffect(() => {
    fetchProducts()
  }, [])
  
  const fetchProducts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      // Get user's organization
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()
      
      if (!userOrg) return
      
      // Get products
      const { data, error } = await supabase
        .from('gym_products')
        .select('*')
        .eq('organization_id', userOrg.organization_id)
        .order('created_at', { ascending: false })
      
      if (!error && data) {
        setProducts(data)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    
    try {
      const { error } = await supabase
        .from('gym_products')
        .delete()
        .eq('id', productId)
      
      if (!error) {
        await fetchProducts()
      }
    } catch (error) {
      console.error('Error deleting product:', error)
    }
  }
  
  const handleGenerateLink = (product: Product) => {
    router.push(`/payments/sell?product=${product.id}`)
  }
  
  const getProcessorIcon = (processor: string) => {
    return processor === 'stripe' 
      ? <CreditCard className="h-4 w-4 text-purple-500" />
      : <Building2 className="h-4 w-4 text-blue-500" />
  }
  
  const getIntervalText = (interval: string | null) => {
    if (!interval) return 'One-time'
    switch (interval) {
      case 'day': return 'Daily'
      case 'week': return 'Weekly'
      case 'month': return 'Monthly'
      case 'year': return 'Yearly'
      default: return interval
    }
  }
  
  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold">Payment Products</h2>
              <p className="text-gray-400 mt-1">Manage products and services you can charge for</p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Product
            </Button>
          </div>
          
          {/* Products Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading products...</div>
            </div>
          ) : products.length === 0 ? (
            <Card className="p-12 text-center">
              <h3 className="text-lg font-semibold mb-2">No products yet</h3>
              <p className="text-gray-400 mb-6">Create your first product to start accepting payments</p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Product
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <Card key={product.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{product.name}</h3>
                      {product.description && (
                        <p className="text-sm text-gray-400 mt-1">{product.description}</p>
                      )}
                    </div>
                    <div className="ml-2">
                      {getProcessorIcon(product.processor)}
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Price</span>
                      <span className="font-semibold">
                        {formatBritishCurrency(product.amount_cents / 100)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Type</span>
                      <span className="text-sm">{getIntervalText(product.interval)}</span>
                    </div>
                    {product.platform_fee_bps && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Platform Fee</span>
                        <span className="text-sm">{product.platform_fee_bps / 100}%</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Status</span>
                      <span className={`text-sm font-medium ${product.active ? 'text-green-500' : 'text-gray-500'}`}>
                        {product.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleGenerateLink(product)}
                      className="flex-1"
                    >
                      <Link className="h-4 w-4 mr-1" />
                      Get Link
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setEditingProduct(product)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDelete(product.id)}
                      className="text-red-500 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Create/Edit Modal */}
      {(showCreateModal || editingProduct) && (
        <ProductModal
          product={editingProduct}
          onClose={() => {
            setShowCreateModal(false)
            setEditingProduct(null)
          }}
          onSave={() => {
            fetchProducts()
            setShowCreateModal(false)
            setEditingProduct(null)
          }}
        />
      )}
    </DashboardLayout>
  )
}

function ProductModal({ 
  product, 
  onClose, 
  onSave 
}: { 
  product: Product | null
  onClose: () => void
  onSave: () => void 
}) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    amount_cents: product?.amount_cents || 0,
    currency: product?.currency || 'gbp',
    interval: product?.interval || '',
    processor: product?.processor || 'stripe',
    platform_fee_bps: product?.platform_fee_bps || 250,
    active: product?.active ?? true
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
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
      
      const productData = {
        ...formData,
        organization_id: userOrg.organization_id,
        amount_cents: Math.round(formData.amount_cents * 100),
        interval: formData.interval || null
      }
      
      if (product) {
        await supabase
          .from('gym_products')
          .update(productData)
          .eq('id', product.id)
      } else {
        await supabase
          .from('gym_products')
          .insert(productData)
      }
      
      onSave()
    } catch (error) {
      console.error('Error saving product:', error)
    } finally {
      setSaving(false)
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md p-6">
        <h3 className="text-xl font-semibold mb-4">
          {product ? 'Edit Product' : 'Create Product'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Description (optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Price (£)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.amount_cents / 100}
                onChange={(e) => setFormData({ ...formData, amount_cents: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="gbp">GBP (£)</option>
                <option value="eur">EUR (€)</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Payment Type</label>
              <select
                value={formData.interval}
                onChange={(e) => setFormData({ ...formData, interval: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">One-time</option>
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Processor</label>
              <select
                value={formData.processor}
                onChange={(e) => setFormData({ ...formData, processor: e.target.value as 'stripe' | 'gocardless' })}
                className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="stripe">Stripe (Cards)</option>
                <option value="gocardless">GoCardless (Direct Debit)</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Platform Fee (%)</label>
            <input
              type="number"
              step="0.01"
              value={formData.platform_fee_bps / 100}
              onChange={(e) => setFormData({ ...formData, platform_fee_bps: Math.round(parseFloat(e.target.value) * 100) || 0 })}
              className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Fee charged by platform on each transaction</p>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="active" className="text-sm">Product is active</label>
          </div>
          
          <div className="flex space-x-3 pt-4">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? 'Saving...' : product ? 'Update' : 'Create'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}