interface SignInButtonProps {
  onClick: () => void
  disabled: boolean
}

export function SignInButton({ onClick, disabled }: SignInButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="cursor-pointer rounded-md border border-amber/40 bg-transparent px-5 py-3 text-[14px] font-medium text-amber transition-colors duration-[180ms] ease-out hover:border-amber hover:bg-amber hover:text-cosmos focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-frost disabled:cursor-not-allowed disabled:opacity-50"
    >
      Sign in with Google
    </button>
  )
}
