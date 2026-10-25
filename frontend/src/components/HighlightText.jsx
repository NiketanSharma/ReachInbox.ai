import React from 'react';

/**
 * Highlights matches of the query string within text (Google Search style)
 */
export const HighlightText = ({ text = '', query = '' }) => {
  if (!query || !query.trim() || !text) {
    return <span>{text}</span>;
  }

  const trimmedQuery = query.trim();
  // Escape special regex characters
  const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = String(text).split(regex);

  return (
    <span>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark
            key={index}
            className="bg-amber-100 text-amber-950 font-semibold px-0.5 rounded shadow-xs"
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  );
};
