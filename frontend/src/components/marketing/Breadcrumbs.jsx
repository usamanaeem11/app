import React from 'react';
import { Link } from 'react-router-dom';

export default function Breadcrumbs({ items }) {
  return (
    <nav className="container mx-auto px-4 py-4">
      <ol className="flex items-center gap-2 text-sm">
        <li>
          <Link to="/" className="text-slate-600 hover:text-slate-900">
            Home
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {item.href ? (
              <Link to={item.href} className="text-slate-600 hover:text-slate-900">
                {item.name}
              </Link>
            ) : (
              <span className="text-slate-900 font-medium">{item.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
