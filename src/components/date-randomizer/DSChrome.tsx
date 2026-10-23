interface DSHeaderProps {
  title: string;
}

export function DSHeader({ title }: DSHeaderProps) {
  return (
    <div className="dr-header">
      <span className="dr-header-title">{title}</span>
    </div>
  );
}

interface DSBottomBarProps {
  onBack?: () => void;
  onOk?: () => void;
  backLabel?: string;
  okLabel?: string;
}

export function DSBottomBar({
  onBack,
  onOk,
  backLabel = "Back",
  okLabel = "OK",
}: DSBottomBarProps) {
  return (
    <div className="dr-bottom-bar">
      {onBack ? (
        <button type="button" className="dr-bar-btn" onClick={onBack}>
          <span className="dr-bar-btn-circle">B</span>
          {backLabel}
        </button>
      ) : (
        <div />
      )}
      {onOk ? (
        <button type="button" className="dr-bar-btn" onClick={onOk}>
          <span className="dr-bar-btn-circle">A</span>
          {okLabel}
        </button>
      ) : (
        <div />
      )}
    </div>
  );
}

/** Yellow corner bracket decorators */
export function YellowBrackets() {
  return (
    <>
      <span className="dr-bracket-tl" />
      <span className="dr-bracket-tr" />
      <span className="dr-bracket-bl" />
      <span className="dr-bracket-br" />
    </>
  );
}
