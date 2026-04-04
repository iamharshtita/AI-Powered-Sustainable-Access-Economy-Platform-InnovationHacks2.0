'use client';
import dynamic from 'next/dynamic';

const FallingLeaves = dynamic(() => import('./FallingLeaves'), { ssr: false });

export default function ClientLeaves() {
  return <FallingLeaves count={15} />;
}
