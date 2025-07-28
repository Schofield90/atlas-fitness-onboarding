'use client'

import DashboardLayout from '../components/DashboardLayout'
import { useState } from 'react'

export default function TodosPage() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Review membership applications', completed: false, priority: 'high' },
    { id: 2, text: 'Update class schedule for next week', completed: false, priority: 'medium' },
    { id: 3, text: 'Follow up with new leads', completed: true, priority: 'high' },
  ])
  const [newTodo, setNewTodo] = useState('')

  const addTodo = () => {
    if (newTodo.trim()) {
      setTodos([
        ...todos,
        {
          id: Date.now(),
          text: newTodo,
          completed: false,
          priority: 'medium'
        }
      ])
      setNewTodo('')
    }
  }

  const toggleTodo = (id: number) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ))
  }

  const deleteTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id))
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold">To-dos</h2>
            <p className="text-gray-400 mt-1">Keep track of your daily tasks and priorities</p>
          </div>

          {/* Add Todo */}
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <input
                type="text"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTodo()}
                placeholder="Add a new task..."
                className="flex-1 px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                onClick={addTodo}
                className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg transition-colors"
              >
                Add Task
              </button>
            </div>
          </div>

          {/* Todo List */}
          <div className="space-y-3">
            {todos.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-8 text-center">
                <p className="text-gray-400">No tasks yet. Add one above!</p>
              </div>
            ) : (
              todos.map(todo => (
                <div
                  key={todo.id}
                  className={`bg-gray-800 rounded-lg p-4 flex items-center gap-3 ${
                    todo.completed ? 'opacity-60' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => toggleTodo(todo.id)}
                    className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
                  />
                  <span
                    className={`flex-1 ${
                      todo.completed ? 'line-through text-gray-500' : 'text-white'
                    }`}
                  >
                    {todo.text}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      todo.priority === 'high'
                        ? 'bg-red-900 text-red-200'
                        : todo.priority === 'medium'
                        ? 'bg-yellow-900 text-yellow-200'
                        : 'bg-green-900 text-green-200'
                    }`}
                  >
                    {todo.priority}
                  </span>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}