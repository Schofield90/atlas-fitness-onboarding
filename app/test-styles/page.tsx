export default function TestStyles() {
  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-4">Tailwind CSS Test</h1>
        <p className="text-gray-300 mb-8">If you can see styled text, Tailwind is working.</p>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-red-500 p-4 rounded-lg text-white">
            Red Box
          </div>
          <div className="bg-green-500 p-4 rounded-lg text-white">
            Green Box
          </div>
          <div className="bg-blue-500 p-4 rounded-lg text-white">
            Blue Box
          </div>
        </div>
        
        <div className="mt-8 p-4 bg-gray-800 rounded-lg">
          <p className="text-orange-500 font-semibold">Orange text in gray box</p>
        </div>
      </div>
    </div>
  )
}