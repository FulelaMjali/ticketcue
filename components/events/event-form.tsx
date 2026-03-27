'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EventCategory } from '@/types';
import { Calendar, Plus, Trash2, Loader2 } from 'lucide-react';

interface EventPhase {
  name: string;
  date: string;
  status: 'upcoming' | 'active' | 'completed';
}

interface EventFormProps {
  initialData?: {
    id?: string;
    title?: string;
    artist?: string;
    venue?: string;
    location?: string;
    date?: string;
    ticketSaleDate?: string;
    presaleDate?: string;
    category?: EventCategory;
    description?: string;
    ticketUrl?: string;
    imageUrl?: string;
    ticketPhases?: EventPhase[];
  };
  isEditing?: boolean;
}

const categories: EventCategory[] = ['concert', 'sports', 'theater', 'comedy', 'festival', 'nightlife'];

export default function EventForm({ initialData, isEditing = false }: EventFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    artist: initialData?.artist || '',
    venue: initialData?.venue || '',
    location: initialData?.location || '',
    date: initialData?.date || '',
    ticketSaleDate: initialData?.ticketSaleDate || '',
    presaleDate: initialData?.presaleDate || '',
    category: initialData?.category || ('concert' as EventCategory),
    description: initialData?.description || '',
    ticketUrl: initialData?.ticketUrl || '',
    imageUrl: initialData?.imageUrl || '',
  });

  const [ticketPhases, setTicketPhases] = useState<EventPhase[]>(
    initialData?.ticketPhases || []
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const handleCategoryChange = (value: string) => {
    setFormData((prev) => ({ ...prev, category: value as EventCategory }));
  };

  const addPhase = useCallback(() => {
    setTicketPhases((prev) => [
      ...prev,
      { name: 'Phase', date: '', status: 'upcoming' as const },
    ]);
  }, []);

  const removePhase = useCallback((index: number) => {
    setTicketPhases((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updatePhase = useCallback((index: number, field: string, value: string) => {
    setTicketPhases((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.title || !formData.venue || !formData.location || !formData.date || !formData.ticketSaleDate) {
        setError('Please fill in all required fields (title, venue, location, event date, ticket sale date)');
        setLoading(false);
        return;
      }

      const payload = {
        ...formData,
        ticketPhases: ticketPhases.length > 0 ? ticketPhases : undefined,
      };

      const endpoint = isEditing && initialData?.id ? `/api/events/${initialData.id}/edit` : '/api/events/create';
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save event');
      }

      const { event } = await response.json();
      router.push(`/events/${event.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6 p-6">
      <h1 className="text-3xl font-bold">{isEditing ? 'Edit Event' : 'Create Event'}</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Event Details</h2>

        <div>
          <label className="block text-sm font-medium mb-1">Event Title *</label>
          <Input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="e.g., Taylor Swift Concert"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Artist/Team</label>
            <Input
              type="text"
              name="artist"
              value={formData.artist}
              onChange={handleInputChange}
              placeholder="e.g., Taylor Swift"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category *</label>
            <Select value={formData.category} onValueChange={handleCategoryChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Venue *</label>
            <Input
              type="text"
              name="venue"
              value={formData.venue}
              onChange={handleInputChange}
              placeholder="e.g., Madison Square Garden"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Location *</label>
            <Input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="e.g., New York, NY"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <Textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Tell us about the event..."
            rows={4}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Image URL</label>
          <Input
            type="url"
            name="imageUrl"
            value={formData.imageUrl}
            onChange={handleInputChange}
            placeholder="https://example.com/image.jpg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Ticket URL</label>
          <Input
            type="url"
            name="ticketUrl"
            value={formData.ticketUrl}
            onChange={handleInputChange}
            placeholder="https://example.com/tickets"
          />
        </div>
      </div>

      {/* Dates */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Date & Time</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Event Date *</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="datetime-local"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Ticket Sale Date *</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="datetime-local"
                name="ticketSaleDate"
                value={formData.ticketSaleDate}
                onChange={handleInputChange}
                className="pl-10"
                required
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Presale Date (Optional)</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="datetime-local"
              name="presaleDate"
              value={formData.presaleDate}
              onChange={handleInputChange}
              className="pl-10"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Leave blank if there's no presale
          </p>
        </div>
      </div>

      {/* Additional Ticket Phases */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Additional Ticket Phases</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addPhase}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Phase
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Add additional ticket sale phases (e.g., for different price tiers or release windows)
        </p>

        {ticketPhases.length > 0 && (
          <div className="space-y-3">
            {ticketPhases.map((phase, index) => (
              <div key={index} className="flex gap-3 p-3 border rounded-lg">
                <div className="flex-1 space-y-2">
                  <Input
                    type="text"
                    value={phase.name}
                    onChange={(e) => updatePhase(index, 'name', e.target.value)}
                    placeholder="Phase name (e.g., 'VIP Presale')"
                  />
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="datetime-local"
                      value={phase.date}
                      onChange={(e) => updatePhase(index, 'date', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removePhase(index)}
                  className="mt-auto"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Section */}
      <div className="flex gap-3 pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isEditing ? 'Update Event' : 'Create Event'}
        </Button>
      </div>
    </form>
  );
}
