interface ErrorAlertProps {
  message: string;
  onDismiss?: () => void;
}

export function ErrorAlert({ message, onDismiss }: ErrorAlertProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
      <div className="flex items-center justify-between">
        <span>{message}</span>
        {onDismiss && (
          <button onClick={onDismiss} className="ml-4 text-red-600 hover:text-red-800">
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
