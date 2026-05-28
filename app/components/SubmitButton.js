'use client';

import { useState } from 'react';

export function SubmitButton({ children, className }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <button
      type="submit"
      className={className}
      disabled={isSubmitting}
      onClick={(event) => {
        if (event.currentTarget.form?.checkValidity()) {
          setIsSubmitting(true);
        }
      }}
    >
      {isSubmitting ? 'Submitting...' : children}
    </button>
  );
}
