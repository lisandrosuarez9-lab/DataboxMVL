import React from 'react';

export default function ProfileCard({ profile }) {
  if (!profile) return null;
  const name = profile?.borrower?.full_name || profile?.borrower?.name || 'Name not provided';
  const score = profile?.score?.factora_score ?? profile?.score?.value ?? null;
  return (
    <aside className="profile-card" role="region" aria-label="Credit profile">
      <h2>{name}</h2>
      <p>Email: {profile?.borrower?.email || 'n/a'}</p>
      <p>National ID: {profile?.borrower?.national_id || 'n/a'}</p>
      <p>Score: {score !== null ? score : 'Unavailable'}</p>
      {profile?.correlation_id && <small>Correlation: {profile.correlation_id}</small>}
    </aside>
  );
}
