import { NextResponse } from 'next/server';

export function proxy() {
  console.log('Proxy: temporarily disabled');
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
