'use client'

import { useState, useEffect } from 'react'
import Button from '@/app/components/ui/Button'
import { ShoppingCart, Download, Check, Plus, X, Filter, AlertCircle } from 'lucide-react'

interface ShoppingListProps {
  profile: any
  shoppingList: any[]
  loading: boolean
  currentWeek?: number
  onToggleItem: (itemId: string, purchased: boolean) => Promise<void>
  onAddItem: (item: any) => Promise<void>
  onRemoveItem: (itemId: string) => Promise<void>
  onClearPurchased: () => Promise<void>
  onRefresh: (week: number) => Promise<void>
}

export default function ShoppingList({ 
  profile, 
  shoppingList, 
  loading, 
  currentWeek = 1,
  onToggleItem,
  onAddItem,
  onRemoveItem,
  onClearPurchased,
  onRefresh
}: ShoppingListProps) {
  const [filter, setFilter] = useState('all')
  const [showAddItem, setShowAddItem] = useState(false)
  const [newItem, setNewItem] = useState({ ingredient: '', quantity: 0, unit: 'g', category: 'Other' })
  const [selectedWeek, setSelectedWeek] = useState(currentWeek)
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    setSelectedWeek(currentWeek)
  }, [currentWeek])

  const handleWeekChange = (week: number) => {
    setSelectedWeek(week)
    onRefresh(week)
  }

  const toggleItem = async (itemId: string, currentStatus: boolean) => {
    setUpdatingItems(prev => new Set(prev).add(itemId))
    try {
      await onToggleItem(itemId, !currentStatus)
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }
  }

  const addCustomItem = async () => {
    if (newItem.ingredient && newItem.quantity > 0) {
      await onAddItem({
        ...newItem,
        week: selectedWeek,
        purchased: false
      })
      setNewItem({ ingredient: '', quantity: 0, unit: 'g', category: 'Other' })
      setShowAddItem(false)
    }
  }

  const downloadList = () => {
    const unpurchasedItems = shoppingList.filter(item => !item.purchased)
    const groupedByCategory = unpurchasedItems.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = []
      acc[item.category].push(`${item.ingredient} - ${item.quantity}${item.unit}`)
      return acc
    }, {} as Record<string, string[]>)
    
    let listText = `Shopping List - Week ${selectedWeek}\n\n`
    Object.entries(groupedByCategory).forEach(([category, items]) => {
      listText += `${category}:\n`
      items.forEach(item => listText += `  • ${item}\n`)
      listText += '\n'
    })
    
    // Create a blob and download it
    const blob = new Blob([listText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shopping-list-week-${selectedWeek}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const filteredItems = filter === 'all' 
    ? shoppingList 
    : shoppingList.filter(item => item.category.toLowerCase() === filter.toLowerCase())

  const categories = ['all', 'Produce', 'Protein', 'Dairy', 'Grains', 'Pantry', 'Other']
  const checkedCount = shoppingList.filter(item => item.purchased).length
  const totalCount = shoppingList.length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading shopping list...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold flex items-center">
            <ShoppingCart className="h-6 w-6 mr-2" />
            Shopping List - Week {selectedWeek}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {checkedCount} of {totalCount} items purchased
          </p>
        </div>
        <div className="flex gap-2">
          {/* Week selector */}
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4].map(week => (
              <Button
                key={week}
                variant={selectedWeek === week ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleWeekChange(week)}
              >
                W{week}
              </Button>
            ))}
          </div>
          {checkedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearPurchased}
            >
              Clear Purchased
            </Button>
          )}
          <Button
            variant="outline"
            onClick={downloadList}
            disabled={totalCount === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-green-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(checkedCount / totalCount) * 100}%` }}
        />
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <Button
            key={cat}
            variant={filter === cat || (filter === 'all' && cat === 'all') ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(cat === 'all' ? 'all' : cat)}
            className="capitalize"
          >
            {cat === 'all' && <Filter className="h-3 w-3 mr-1" />}
            {cat}
          </Button>
        ))}
      </div>

      {/* Shopping Items */}
      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>{filter === 'all' ? 'No items in your shopping list' : `No ${filter} items`}</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                item.purchased ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center flex-1">
                <button
                  onClick={() => toggleItem(item.id, item.purchased)}
                  disabled={updatingItems.has(item.id)}
                  className={`w-5 h-5 rounded border-2 mr-4 flex items-center justify-center transition-colors ${
                    item.purchased
                      ? 'bg-green-500 border-green-500'
                      : 'border-gray-300 hover:border-gray-400'
                  } ${updatingItems.has(item.id) ? 'opacity-50' : ''}`}
                >
                  {item.purchased && <Check className="h-3 w-3 text-white" />}
                </button>
                <div className="flex-1">
                  <span className={`font-medium ${item.purchased ? 'line-through' : ''}`}>
                    {item.ingredient}
                  </span>
                  <span className="text-gray-500 ml-2">- {item.quantity}{item.unit}</span>
                </div>
                <span className="text-xs text-gray-400 capitalize bg-gray-100 px-2 py-1 rounded">
                  {item.category}
                </span>
              </div>
              <button
                onClick={() => onRemoveItem(item.id)}
                className="ml-4 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))
        )}

        {/* Add Custom Item */}
        {showAddItem ? (
          <div className="p-4 bg-blue-50">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Item name"
                value={newItem.ingredient}
                onChange={(e) => setNewItem({ ...newItem, ingredient: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Quantity"
                value={newItem.quantity || ''}
                onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newItem.unit}
                onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="ml">ml</option>
                <option value="l">l</option>
                <option value="units">units</option>
                <option value="cups">cups</option>
                <option value="tbsp">tbsp</option>
                <option value="tsp">tsp</option>
              </select>
              <select
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Produce">Produce</option>
                <option value="Protein">Protein</option>
                <option value="Dairy">Dairy</option>
                <option value="Grains">Grains</option>
                <option value="Pantry">Pantry</option>
                <option value="Other">Other</option>
              </select>
              <Button onClick={addCustomItem} size="sm">Add</Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setShowAddItem(false)
                  setNewItem({ ingredient: '', quantity: 0, unit: 'g', category: 'Other' })
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddItem(true)}
            className="w-full p-4 text-center text-gray-500 hover:text-gray-700 hover:bg-gray-50 flex items-center justify-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Custom Item
          </button>
        )}
      </div>

      {/* Shopping Tips */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h4 className="font-semibold mb-3">Shopping Tips</h4>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start">
            <span className="mr-2">💡</span>
            Shop the perimeter of the store first - that's where fresh produce, meats, and dairy are typically located
          </li>
          <li className="flex items-start">
            <span className="mr-2">💡</span>
            Buy proteins in bulk and freeze portions for the week
          </li>
          <li className="flex items-start">
            <span className="mr-2">💡</span>
            Prep vegetables after shopping to save time during the week
          </li>
          <li className="flex items-start">
            <span className="mr-2">💡</span>
            Check for sales on non-perishable items like rice, oats, and canned goods
          </li>
        </ul>
      </div>
    </div>
  )
}