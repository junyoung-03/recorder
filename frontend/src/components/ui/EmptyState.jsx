import React from 'react';

function EmptyState({ title, description, action }) {
  return (
    <div className="bg-white border border-dashed border-warm rounded-2xl px-6 py-10 text-center text-slate-500">
      <div className="flex justify-center mb-3 text-slate-400">
        <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h8m-8 4h8m-8 4h6M8 3h6l4 4v14a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
        </svg>
      </div>
      <h3 className="text-card-title">{title}</h3>
      {description && <p className="text-muted mt-2">{description}</p>}
      {action && (
        <div className="mt-4">
          <a href={action.href} className="btn-primary px-4 py-2 text-white text-sm font-semibold">
            {action.label}
          </a>
        </div>
      )}
    </div>
  );
}

export default EmptyState;


