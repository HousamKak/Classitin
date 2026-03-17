export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="relative">
        <div className="h-10 w-10 rounded-full border-[3px] border-gray-200" />
        <div className="absolute inset-0 h-10 w-10 rounded-full border-[3px] border-transparent border-t-primary-600 animate-spin" />
      </div>
    </div>
  );
}
