'use client';

export function DeleteUserButton({ disabled }) {
  return (
    <button
      className="min-h-10 rounded-md border px-3 py-2 text-sm text-red-700 disabled:cursor-not-allowed disabled:text-slate-400"
      disabled={disabled}
      title={disabled ? 'You cannot delete the account you are currently using.' : undefined}
      type="button"
      onClick={(event) => {
        if (disabled) return;
        if (window.confirm('Delete this user account? Submitted stories and comments will be preserved.')) event.currentTarget.form?.requestSubmit();
      }}
    >
      Delete user
    </button>
  );
}
