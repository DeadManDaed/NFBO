//src/components/Alert.jsx

export default function Alert({ message, type, onClose }) {
  if (!message) return null;

  const bgColors = {
    success: 'bg-green-100 border-green-500 text-green-800',
    error: 'bg-red-100 border-red-500 text-red-800',
    warning: 'bg-yellow-100 border-yellow-500 text-yellow-800',
    info: 'bg-blue-100 border-blue-500 text-blue-800',
  };

  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg border-l-4 shadow-lg ${bgColors[type] || bgColors.info} animate-slide-in`}>
      <div className="flex items-center justify-between gap-4">
        <p className="font-medium">{message}</p>
        {onClose && (
          <button onClick={onClose} className="text-xl font-bold hover:opacity-70">
            ×
          </button>
        )}
      </div>
    </div>
  );
}