export default function AppLoader({
  message = 'Preparing your study space...',
}: {
  message?: string;
}) {
  return (
    <main className="app-loader">
      <div className="loader-brand">
        <div className="brand-mark loader-mark">F</div>
        <div className="loader-wordmark">Fundza</div>
      </div>

      <div className="loader-spinner" aria-label="Loading" />

      <p>{message}</p>
    </main>
  );
}
