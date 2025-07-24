export default function TestDeployment() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Deployment Test Page</h1>
      <p className="mb-4">If you can see this, the deployment is working!</p>
      <p className="text-sm text-gray-600">
        Deployed at: {new Date().toISOString()}
      </p>
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Quick Links:</h2>
        <ul className="space-y-2">
          <li>
            <a href="/emergency" className="text-blue-600 hover:underline">
              Emergency Access (should work)
            </a>
          </li>
          <li>
            <a href="/api/debug/get-org-id" className="text-blue-600 hover:underline">
              Get Organization ID API
            </a>
          </li>
          <li>
            <a href="/book-now/63589490-8f55-4157-bd3a-e141594b740e" className="text-blue-600 hover:underline">
              Public Booking Page
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}