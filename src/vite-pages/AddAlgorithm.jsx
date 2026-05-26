import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addAlgorithm } from '@/lib/localData';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PlusCircle, ArrowLeft, Upload, X } from "lucide-react";
import { toast } from "sonner";

export default function AddAlgorithm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'Active',
    use_case: '',
    use_case_brief: '',
    impact_level: '',
    documentation_url: '',
    used_by: '',
    location: '',
    year_introduced: '',
    purpose: '',
    data_used: '',
    decision_type: '',
    year_deployed: '',
    current_version: '',
    storyboard_images: []
  });

  const [imageUrl, setImageUrl] = useState('');

  const createMutation = useMutation({
    mutationFn: (data) => {
      addAlgorithm(data);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['algorithms'] });
      toast.success('Algorithm added successfully!');
      navigate('/');
    },
    onError: (error) => {
      toast.error('Failed to add algorithm');
      console.error(error);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      year_introduced: formData.year_introduced ? parseInt(formData.year_introduced) : undefined,
      year_deployed: formData.year_deployed ? parseInt(formData.year_deployed) : undefined,
    };

    createMutation.mutate(submitData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addImageUrl = () => {
    if (imageUrl.trim()) {
      setFormData(prev => ({
        ...prev,
        storyboard_images: [...prev.storyboard_images, imageUrl.trim()]
      }));
      setImageUrl('');
    }
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      storyboard_images: prev.storyboard_images.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-slate-100">
      <section className="relative overflow-hidden bg-gradient-to-r from-[#201805] via-[#4b3508] to-[#0a0a0a] border-b border-white/15">
        <div className="absolute inset-0 opacity-[0.2] [background-image:linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:38px_38px]" />
        <div className="relative max-w-4xl mx-auto px-6 py-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Add New Algorithm</h1>
          <p className="text-yellow-100/80 mt-2">Document a public algorithm profile for community transparency.</p>
        </div>
      </section>
      <div className="max-w-4xl mx-auto px-6 py-10">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6 border border-gray-200 bg-white hover:bg-gray-50"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <PlusCircle className="w-8 h-8 text-yellow-600" />
            <h2 className="text-3xl font-bold text-gray-900">Algorithm Details</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Basic Information</h2>
              
              <div>
                <Label htmlFor="name">Algorithm Name *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Enter algorithm name"
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  required
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Brief description of what the algorithm does"
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleChange('status', value)}
                  >
                    <SelectTrigger className="!border-gray-200 focus:!border-gray-300 focus:!ring-1 focus:!ring-gray-300/70">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="In Development">In Development</SelectItem>
                      <SelectItem value="Deprecated">Deprecated</SelectItem>
                      <SelectItem value="Under Review">Under Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="impact_level">Impact Level</Label>
                  <Select
                    value={formData.impact_level}
                    onValueChange={(value) => handleChange('impact_level', value)}
                  >
                    <SelectTrigger className="!border-gray-200 focus:!border-gray-300 focus:!ring-1 focus:!ring-gray-300/70">
                      <SelectValue placeholder="Select impact level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Detailed Information</h2>
              
              <div>
                <Label htmlFor="purpose">Purpose</Label>
                <Textarea
                  id="purpose"
                  value={formData.purpose}
                  onChange={(e) => handleChange('purpose', e.target.value)}
                  placeholder="What is the purpose of this algorithm?"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="use_case">Use Case</Label>
                <Select
                  value={formData.use_case}
                  onValueChange={(value) => handleChange('use_case', value)}
                >
                  <SelectTrigger className="!border-gray-200 focus:!border-gray-300 focus:!ring-1 focus:!ring-gray-300/70">
                    <SelectValue placeholder="Select use case" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fraud Detection">Fraud Detection</SelectItem>
                    <SelectItem value="Traffic Management">Traffic Management</SelectItem>
                    <SelectItem value="Student Support">Student Support</SelectItem>
                    <SelectItem value="Job Matching">Job Matching</SelectItem>
                    <SelectItem value="Energy Forecasting">Energy Forecasting</SelectItem>
                    <SelectItem value="Child Welfare">Child Welfare</SelectItem>
                    <SelectItem value="Housing Prioritization">Housing Prioritization</SelectItem>
                    <SelectItem value="Healthcare">Healthcare</SelectItem>
                    <SelectItem value="Public Safety">Public Safety</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="use_case_brief">Use Case Brief</Label>
                <Textarea
                  id="use_case_brief"
                  value={formData.use_case_brief}
                  onChange={(e) => handleChange('use_case_brief', e.target.value)}
                  placeholder="Brief description of what this algorithm group is about"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="used_by">Used By</Label>
                <Input
                  id="used_by"
                  value={formData.used_by}
                  onChange={(e) => handleChange('used_by', e.target.value)}
                  placeholder="Specific entity or organization using this algorithm"
                />
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Select
                  value={formData.location}
                  onValueChange={(value) => handleChange('location', value)}
                >
                  <SelectTrigger className="!border-gray-200 focus:!border-gray-300 focus:!ring-1 focus:!ring-gray-300/70">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pittsburgh">Pittsburgh</SelectItem>
                    <SelectItem value="Philadelphia">Philadelphia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="data_used">Data Used</Label>
                <Textarea
                  id="data_used"
                  value={formData.data_used}
                  onChange={(e) => handleChange('data_used', e.target.value)}
                  placeholder="Specific data used for analysis"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="decision_type">Decision Type</Label>
                <Input
                  id="decision_type"
                  value={formData.decision_type}
                  onChange={(e) => handleChange('decision_type', e.target.value)}
                  placeholder="The type of decision this algorithm produces"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Technical Details</h2>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="year_introduced">Year Introduced</Label>
                  <Input
                    id="year_introduced"
                    type="number"
                    value={formData.year_introduced}
                    onChange={(e) => handleChange('year_introduced', e.target.value)}
                    placeholder="e.g., 2020"
                  />
                </div>

                <div>
                  <Label htmlFor="year_deployed">Year Deployed</Label>
                  <Input
                    id="year_deployed"
                    type="number"
                    value={formData.year_deployed}
                    onChange={(e) => handleChange('year_deployed', e.target.value)}
                    placeholder="e.g., 2021"
                  />
                </div>

                <div>
                  <Label htmlFor="current_version">Current Version</Label>
                  <Input
                    id="current_version"
                    value={formData.current_version}
                    onChange={(e) => handleChange('current_version', e.target.value)}
                    placeholder="e.g., 1.2.3"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="documentation_url">Documentation URL</Label>
                <Input
                  id="documentation_url"
                  type="url"
                  value={formData.documentation_url}
                  onChange={(e) => handleChange('documentation_url', e.target.value)}
                  placeholder="https://example.com/docs"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Storyboard Images</h2>
              
              <div className="flex gap-2">
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Enter image URL"
                  className="flex-1"
                />
                <Button type="button" onClick={addImageUrl} variant="outline" className="border-gray-300 hover:bg-gray-50">
                  <Upload className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>

              {formData.storyboard_images.length > 0 && (
                <div className="grid md:grid-cols-3 gap-4">
                  {formData.storyboard_images.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Storyboard ${index + 1}`}
                        className="w-full h-32 object-cover rounded border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-yellow-500 hover:bg-yellow-400 text-gray-900"
              >
                {createMutation.isPending ? 'Adding...' : 'Add Algorithm'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
