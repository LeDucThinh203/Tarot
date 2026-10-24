export function LoadingState({ label = 'Đang mở lại trải bài của bạn...' }: { label?: string }) {
  return <div className="loading-state" role="status"><span className="spinner" /><p>{label}</p></div>;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="error-state" role="alert"><span className="error-symbol">✧</span><p>{message}</p>{retry && <button className="button button-ghost" onClick={retry}>Thử lại</button>}</div>;
}
