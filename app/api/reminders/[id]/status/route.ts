import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

const statusSchema = z.object({
  status: z.enum(['active', 'completed', 'dismissed']),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = statusSchema.parse(body);

    const response = await fetch(new URL(`/api/reminders/${id}`, req.url), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        cookie: req.headers.get('cookie') || '',
      },
      body: JSON.stringify({ status: parsed.status }),
    });

    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message ?? 'Invalid input' }, { status: 400 });
    }

    console.error('Update reminder status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
