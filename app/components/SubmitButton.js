'use client';

import { useEffect, useRef, useState } from 'react';

export function SubmitButton({ children, className }) {
  const buttonRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const form = buttonRef.current?.form;
    if (!form) return undefined;

    let resetTimer;
    const handleSubmit = () => {
      setIsSubmitting(true);
      resetTimer = window.setTimeout(() => setIsSubmitting(false), 15000);
    };
    const handlePageShow = () => setIsSubmitting(false);

    form.addEventListener('submit', handleSubmit);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      form.removeEventListener('submit', handleSubmit);
      window.removeEventListener('pageshow', handlePageShow);
      window.clearTimeout(resetTimer);
    };
  }, []);

  return (
    <button
      ref={buttonRef}
      type="submit"
      className={className}
      disabled={isSubmitting}
    >
      {isSubmitting ? 'Submitting...' : children}
    </button>
  );
}
