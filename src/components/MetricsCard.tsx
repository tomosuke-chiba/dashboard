interface MetricsCardProps {
  title: string;
  value: number;
  icon: 'pv' | 'application';
  lastUpdated?: string;
}

export default function MetricsCard({ title, value, icon, lastUpdated }: MetricsCardProps) {
  const iconStyles = {
    pv: {
      bg: 'bg-blue-100',
      text: 'text-blue-600',
      svg: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
    },
    application: {
      bg: 'bg-green-100',
      text: 'text-green-600',
      svg: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  };

  const style = iconStyles[icon];

  return (
    <div className="bg-white rounded-lg p-6 shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-3xl font-bold mt-1">{value.toLocaleString()}</p>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-2">
              最終更新: {formatDateTime(lastUpdated)}
            </p>
          )}
        </div>
        <div className={`${style.bg} ${style.text} p-3 rounded-full`}>
          {style.svg}
        </div>
      </div>
    </div>
  );
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
