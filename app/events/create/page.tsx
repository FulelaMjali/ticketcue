import EventForm from '@/components/events/event-form';
import { AppLayout } from '@/components/layout/app-layout';

export default function CreateEventPage() {
  return (
    <AppLayout>
      <div className="container mx-auto">
        <EventForm />
      </div>
    </AppLayout>
  );
}
