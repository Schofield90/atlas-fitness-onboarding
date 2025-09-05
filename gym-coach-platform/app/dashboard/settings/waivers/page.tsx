'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Save,
  X,
  AlertTriangle
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'react-hot-toast';
import { formatBritishDate } from '@/lib/utils/british-format';

interface Waiver {
  id: string;
  title: string;
  content: string;
  version: number;
  is_active: boolean;
  required_for: string[];
  created_at: string;
  updated_at: string;
}

export default function WaiversSettingsPage() {
  const [waivers, setWaivers] = useState<Waiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingWaiver, setEditingWaiver] = useState<Waiver | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const supabase = createClientComponentClient();

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    required_for: [] as string[],
    is_active: true
  });

  useEffect(() => {
    loadWaivers();
  }, []);

  const loadWaivers = async () => {
    try {
      const { data, error } = await supabase
        .from('waivers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWaivers(data || []);
    } catch (error) {
      console.error('Error loading waivers:', error);
      toast.error('Failed to load waivers');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWaiver = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    setSaving(true);
    try {
      if (editingWaiver) {
        // Update existing waiver
        const { error } = await supabase
          .from('waivers')
          .update({
            title: formData.title,
            content: formData.content,
            required_for: formData.required_for,
            is_active: formData.is_active,
            version: editingWaiver.version + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingWaiver.id);

        if (error) throw error;
        toast.success('Waiver updated successfully');
      } else {
        // Create new waiver
        const { error } = await supabase
          .from('waivers')
          .insert({
            title: formData.title,
            content: formData.content,
            required_for: formData.required_for,
            is_active: formData.is_active,
            version: 1
          });

        if (error) throw error;
        toast.success('Waiver created successfully');
      }

      setIsDialogOpen(false);
      setEditingWaiver(null);
      resetForm();
      await loadWaivers();
    } catch (error) {
      console.error('Error saving waiver:', error);
      toast.error('Failed to save waiver');
    } finally {
      setSaving(false);
    }
  };

  const handleEditWaiver = (waiver: Waiver) => {
    setEditingWaiver(waiver);
    setFormData({
      title: waiver.title,
      content: waiver.content,
      required_for: waiver.required_for || [],
      is_active: waiver.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDeleteWaiver = async (waiverId: string) => {
    if (!confirm('Are you sure you want to delete this waiver? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('waivers')
        .delete()
        .eq('id', waiverId);

      if (error) throw error;
      toast.success('Waiver deleted successfully');
      await loadWaivers();
    } catch (error) {
      console.error('Error deleting waiver:', error);
      toast.error('Failed to delete waiver');
    }
  };

  const toggleWaiverStatus = async (waiver: Waiver) => {
    try {
      const { error } = await supabase
        .from('waivers')
        .update({ is_active: !waiver.is_active })
        .eq('id', waiver.id);

      if (error) throw error;
      toast.success(`Waiver ${waiver.is_active ? 'deactivated' : 'activated'} successfully`);
      await loadWaivers();
    } catch (error) {
      console.error('Error updating waiver status:', error);
      toast.error('Failed to update waiver status');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      required_for: [],
      is_active: true
    });
  };

  const handleRequiredForChange = (value: string) => {
    const currentValues = formData.required_for;
    if (currentValues.includes(value)) {
      setFormData({
        ...formData,
        required_for: currentValues.filter(v => v !== value)
      });
    } else {
      setFormData({
        ...formData,
        required_for: [...currentValues, value]
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Waiver Templates</h1>
          <p className="text-muted-foreground">Manage digital waiver templates for your clients</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingWaiver(null);
              resetForm();
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Waiver
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingWaiver ? 'Edit Waiver Template' : 'Create Waiver Template'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., General Liability Waiver"
                />
              </div>

              <div>
                <Label htmlFor="content">Waiver Content</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Enter the full waiver text that clients will need to agree to..."
                  className="min-h-[300px]"
                />
              </div>

              <div>
                <Label>Required For</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['membership', 'trial', 'class', 'personal_training'].map((option) => (
                    <Button
                      key={option}
                      type="button"
                      variant={formData.required_for.includes(option) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleRequiredForChange(option)}
                    >
                      {option.replace('_', ' ')}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
                <Label htmlFor="is_active">Active (available for assignment)</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingWaiver(null);
                    resetForm();
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSaveWaiver} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Waiver'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Waivers List */}
      {waivers.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Waiver Templates</h3>
              <p className="text-muted-foreground mb-4">
                Create your first waiver template to start collecting digital signatures from clients.
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Waiver
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {waivers.map((waiver) => (
            <Card key={waiver.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5" />
                    <div>
                      <CardTitle>{waiver.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Version {waiver.version} • Created {formatBritishDate(waiver.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={waiver.is_active ? 'default' : 'secondary'}>
                      {waiver.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Required For:</p>
                    <div className="flex flex-wrap gap-2">
                      {waiver.required_for?.length > 0 ? (
                        waiver.required_for.map((req) => (
                          <Badge key={req} variant="outline" className="text-xs">
                            {req.replace('_', ' ')}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">None specified</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Content Preview:</p>
                    <div className="bg-gray-50 p-3 rounded text-sm max-h-32 overflow-y-auto">
                      {waiver.content.substring(0, 200)}
                      {waiver.content.length > 200 && '...'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditWaiver(waiver)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleWaiverStatus(waiver)}
                      >
                        {waiver.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteWaiver(waiver.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}