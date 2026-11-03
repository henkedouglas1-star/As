import React from 'react';
import { useAuth } from '../context/AuthContext';
import { AffiliateDashboard } from '../components/AffiliateDashboard';

interface AffiliatePageProps {
  onNavigate: (route: string) => void;
}

export default function AffiliatePage({ onNavigate }: AffiliatePageProps) {
  const { user } = useAuth();
  return <AffiliateDashboard currentUser={user} onNavigate={onNavigate} />;
}
