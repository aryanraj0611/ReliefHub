import Navbar from '../../components/Navbar';

export default function CitizenDashboard() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="panel p-10 text-center max-w-lg">
          <div className="text-4xl mb-4">🏘️</div>
          <h2 className="text-2xl font-bold text-slate-100 mb-2">Citizen Dashboard</h2>
          <p className="text-slate-400">
            Report incidents, check safety status, and find nearby shelters — coming soon.
          </p>
        </div>
      </main>
    </div>
  );
}
