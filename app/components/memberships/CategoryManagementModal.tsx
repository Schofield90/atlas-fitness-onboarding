"use client";

import { useState, useEffect } from "react";
import { X, Plus, Edit2, Trash2, Save } from "lucide-react";
import toast from "@/app/lib/toast";

interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  display_order: number;
}

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryChange?: () => void;
}

const PRESET_COLORS = [
  { name: "Gray", hex: "#6B7280" },
  { name: "Red", hex: "#EF4444" },
  { name: "Orange", hex: "#F97316" },
  { name: "Amber", hex: "#F59E0B" },
  { name: "Yellow", hex: "#EAB308" },
  { name: "Lime", hex: "#84CC16" },
  { name: "Green", hex: "#10B981" },
  { name: "Emerald", hex: "#059669" },
  { name: "Teal", hex: "#14B8A6" },
  { name: "Cyan", hex: "#06B6D4" },
  { name: "Sky", hex: "#0EA5E9" },
  { name: "Blue", hex: "#3B82F6" },
  { name: "Indigo", hex: "#6366F1" },
  { name: "Violet", hex: "#8B5CF6" },
  { name: "Purple", hex: "#A855F7" },
  { name: "Fuchsia", hex: "#D946EF" },
  { name: "Pink", hex: "#EC4899" },
  { name: "Rose", hex: "#F43F5E" },
];

export default function CategoryManagementModal({
  isOpen,
  onClose,
  onCategoryChange,
}: CategoryManagementModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    color: "#6B7280",
  });

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/membership-categories");
      const result = await response.json();

      if (response.ok) {
        setCategories(result.categories || []);
      } else {
        toast.error(result.error || "Failed to load categories");
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      const response = await fetch("/api/membership-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCategory.name.trim(),
          description: newCategory.description.trim() || null,
          color: newCategory.color,
          display_order: categories.length,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Category created successfully");
        setNewCategory({ name: "", description: "", color: "#6B7280" });
        fetchCategories();
        onCategoryChange?.();
      } else {
        toast.error(result.error || "Failed to create category");
      }
    } catch (error) {
      console.error("Error creating category:", error);
      toast.error("Failed to create category");
    }
  };

  const handleUpdateCategory = async (category: Category) => {
    try {
      const response = await fetch("/api/membership-categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(category),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Category updated successfully");
        setEditingId(null);
        fetchCategories();
        onCategoryChange?.();
      } else {
        toast.error(result.error || "Failed to update category");
      }
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("Failed to update category");
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm("Are you sure? Plans in this category will be uncategorized.")) {
      return;
    }

    try {
      const response = await fetch(`/api/membership-categories?id=${categoryId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Category deleted successfully");
        fetchCategories();
        onCategoryChange?.();
      } else {
        toast.error(result.error || "Failed to delete category");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category");
    }
  };

  const handleCategoryChange = (id: string, field: keyof Category, value: any) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, [field]: value } : cat))
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            Manage Membership Categories
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Create New Category */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-lg font-medium text-white mb-4">
              Create New Category
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Category Name*
                </label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) =>
                    setNewCategory({ ...newCategory, name: e.target.value })
                  }
                  placeholder="e.g., Premium Plans"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={newCategory.description}
                  onChange={(e) =>
                    setNewCategory({ ...newCategory, description: e.target.value })
                  }
                  placeholder="Brief description"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Color</label>
                <div className="grid grid-cols-9 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.hex}
                      onClick={() =>
                        setNewCategory({ ...newCategory, color: color.hex })
                      }
                      className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                        newCategory.color === color.hex
                          ? "ring-2 ring-white ring-offset-2 ring-offset-gray-900"
                          : ""
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={handleCreateCategory}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Category
              </button>
            </div>
          </div>

          {/* Existing Categories */}
          <div>
            <h3 className="text-lg font-medium text-white mb-3">
              Existing Categories ({categories.length})
            </h3>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                <p className="text-gray-400 mt-2 text-sm">Loading categories...</p>
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-8 bg-gray-900 rounded-lg">
                <p className="text-gray-400">No categories created yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Create your first category above
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="bg-gray-900 rounded-lg p-4 flex items-center gap-3"
                  >
                    {/* Color Indicator */}
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: category.color }}
                    />

                    {/* Category Info */}
                    {editingId === category.id ? (
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={category.name}
                          onChange={(e) =>
                            handleCategoryChange(category.id, "name", e.target.value)
                          }
                          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
                        />
                        <input
                          type="text"
                          value={category.description || ""}
                          onChange={(e) =>
                            handleCategoryChange(
                              category.id,
                              "description",
                              e.target.value
                            )
                          }
                          placeholder="Description"
                          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
                        />
                        <div className="grid grid-cols-9 gap-1">
                          {PRESET_COLORS.map((color) => (
                            <button
                              key={color.hex}
                              onClick={() =>
                                handleCategoryChange(category.id, "color", color.hex)
                              }
                              className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${
                                category.color === color.hex
                                  ? "ring-2 ring-white"
                                  : ""
                              }`}
                              style={{ backgroundColor: color.hex }}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1">
                        <div className="font-medium text-white">{category.name}</div>
                        {category.description && (
                          <div className="text-sm text-gray-400">
                            {category.description}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {editingId === category.id ? (
                        <button
                          onClick={() => handleUpdateCategory(category)}
                          className="text-green-400 hover:text-green-300 p-1"
                          title="Save"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setEditingId(category.id)}
                          className="text-blue-400 hover:text-blue-300 p-1"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-4">
          <button
            onClick={onClose}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
