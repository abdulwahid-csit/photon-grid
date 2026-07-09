import { memo, useMemo, type ComponentType } from 'react';

interface EmployeeCellProps {
  row: {
    fullName: string;
    jobTitle: string;
    rowIndex?: number;
  };
  rowIndex: number;
}

export const EmployeeCell: ComponentType<EmployeeCellProps> = memo(({ row, rowIndex }) => {
  const index = useMemo(() => ((rowIndex * 37 + 17) % 61), [rowIndex]);
  const avatarSrc = useMemo(() => `https://i.pravatar.cc/64?img=${index}`, [index]);

  return (
    <div className="employee-cell">
      <img
        className="employee-cell__avatar"
        src={avatarSrc}
        alt={row.fullName}
        width="32"
        height="32"
        loading="lazy"
        decoding="async"
      />
      <div className="employee-cell__text"> 
        <span className="employee-cell__name">{row.fullName}</span>
        <span className="employee-cell__title">{row.jobTitle}</span>
      </div>
    </div>
  );
});

export default EmployeeCell;
