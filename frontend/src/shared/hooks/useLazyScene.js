import React, { lazy, Suspense } from 'react';

export function lazyScene(importFn) {
  const Comp = lazy(importFn);
  return (props) => (
    <Suspense fallback={<div className="p-4">Loading scene...</div>}>
      <Comp {...props} />
    </Suspense>
  );
}

