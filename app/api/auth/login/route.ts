import { NextRequest, NextResponse } from 'next/server';
import { signIn } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, callbackUrl } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl: callbackUrl || '/dashboard',
    });

    if (!result?.ok) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true, url: result.url }, { status: 200 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
