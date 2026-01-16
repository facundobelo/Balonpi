interface FormArrowProps {
  condition: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const arrowMap: Record<string, { symbol: string; class: string }> = {
  UP: { symbol: '▲', class: 'arrow-up' },
  SLIGHT_UP: { symbol: '▴', class: 'arrow-slight-up' },
  MID: { symbol: '▸', class: 'arrow-mid' },
  STABLE: { symbol: '▸', class: 'arrow-mid' },
  SLIGHT_DOWN: { symbol: '▾', class: 'arrow-slight-down' },
  DOWN: { symbol: '▼', class: 'arrow-down' },
};

const defaultArrow = { symbol: '▸', class: 'arrow-mid' };

const sizeMap = {
  xs: 'text-[8px]',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export function FormArrow({ condition, size = 'md' }: FormArrowProps) {
  const { symbol, class: colorClass } = arrowMap[condition] || defaultArrow;

  return (
    <span className={`${colorClass} ${sizeMap[size]} font-bold`} title={condition}>
      {symbol}
    </span>
  );
}
