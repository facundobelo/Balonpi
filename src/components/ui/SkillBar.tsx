interface SkillBarProps {
  value: number;
  max?: number;
  showValue?: boolean;
  size?: 'sm' | 'md';
}

export function SkillBar({ value, max = 99, showValue = true, size = 'md' }: SkillBarProps) {
  const percentage = Math.min(100, (value / max) * 100);

  const heightClass = size === 'sm' ? 'h-1' : 'h-1.5';

  return (
    <div className="flex items-center gap-2">
      <div className={`skill-bar flex-1 ${heightClass}`}>
        <div
          className="skill-bar-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showValue && (
        <span className="font-data text-xs text-[--color-text-secondary] w-6 text-right">
          {value}
        </span>
      )}
    </div>
  );
}
