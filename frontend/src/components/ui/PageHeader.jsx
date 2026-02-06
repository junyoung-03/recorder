import React from 'react';
import { navigate } from '../../lib/navigation';

const VARIANTS = {
  primary: 'btn-primary text-white',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
};

function PageHeader({ title, description, actions = [] }) {
  return (
    <div className="bg-white border border-warm rounded-2xl px-6 py-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-title">{title}</h2>
          {description && <p className="text-muted mt-1">{description}</p>}
        </div>
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => {
              const className = `px-4 py-2 text-sm font-semibold transition ${
                VARIANTS[action.variant || 'primary']
              }`;
              if (action.href) {
                return (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => navigate(action.href)}
                    className={className}
                  >
                    {action.label}
                  </button>
                );
              }
              return (
                <button key={action.label} type="button" onClick={action.onClick} className={className}>
                  {action.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default PageHeader;


