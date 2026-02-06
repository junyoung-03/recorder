import React from 'react';

function FilterBar({ children }) {
  return (
    <div className="bg-white border border-warm rounded-2xl px-6 py-4 shadow-sm flex flex-wrap gap-3 items-center">
      {children}
    </div>
  );
}

export default FilterBar;


