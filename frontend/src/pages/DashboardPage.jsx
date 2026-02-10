function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-semibold text-gray-700 mb-2">Catalogue</h3>
            <p className="text-gray-600">Browse products</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-semibold text-gray-700 mb-2">Orders</h3>
            <p className="text-gray-600">View order history</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-semibold text-gray-700 mb-2">Account</h3>
            <p className="text-gray-600">Manage account</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;