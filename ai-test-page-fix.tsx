// Fix for the AI test page saveAnswer function
// The issue is that the fetch request needs to include credentials: 'include' 
// to send cookies with the request for authentication

const saveAnswer = async (category: string, question: string, answer: string) => {
  if (!answer.trim()) {
    toast.error('Please provide an answer');
    return;
  }

  try {
    const response = await fetch('/api/training-data/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // This is the key fix - include cookies for authentication
      body: JSON.stringify({
        data_type: 'sop',
        content: `${category}\n\nQ: ${question}\n\nA: ${answer}`,
        category: category
      }),
    });

    if (response.ok) {
      toast.success('Answer saved! This will improve AI responses.');
      const key = `${category}-${question}`;
      setAnswerText(prev => ({ ...prev, [key]: '' }));
      fetchTrainingData();
    } else {
      const errorData = await response.json();
      console.error('API Error:', errorData);
      toast.error(`Failed to save answer: ${errorData.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error saving answer:', error);
    toast.error('Failed to save answer');
  }
};

// Alternative approach - using Supabase client directly instead of API route
// This would bypass the authentication issue entirely

import { createClient } from '@/lib/supabase/client';

const saveAnswerAlternative = async (category: string, question: string, answer: string) => {
  if (!answer.trim()) {
    toast.error('Please provide an answer');
    return;
  }

  try {
    const supabase = createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      toast.error('Authentication required');
      return;
    }

    // Get user profile with organization
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      toast.error('User profile not found');
      return;
    }

    // Check existing training data for versioning
    const { data: existingData } = await supabase
      .from('training_data')
      .select('id, version')
      .eq('organization_id', userProfile.organization_id)
      .eq('data_type', 'sop')
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = existingData && existingData.length > 0 
      ? (existingData[0].version || 0) + 1 
      : 1;

    // Insert new training data
    const { data, error } = await supabase
      .from('training_data')
      .insert({
        organization_id: userProfile.organization_id,
        data_type: 'sop',
        content: `${category}\n\nQ: ${question}\n\nA: ${answer}`,
        version: nextVersion,
        is_active: true,
        metadata: { category }
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving training data:', error);
      toast.error('Failed to save training data');
      return;
    }

    // Deactivate previous versions if this is a new version
    if (nextVersion > 1) {
      await supabase
        .from('training_data')
        .update({ is_active: false })
        .eq('organization_id', userProfile.organization_id)
        .eq('data_type', 'sop')
        .neq('id', data.id);
    }

    toast.success('Answer saved! This will improve AI responses.');
    const key = `${category}-${question}`;
    setAnswerText(prev => ({ ...prev, [key]: '' }));
    fetchTrainingData();

  } catch (error) {
    console.error('Error saving answer:', error);
    toast.error('Failed to save answer');
  }
};