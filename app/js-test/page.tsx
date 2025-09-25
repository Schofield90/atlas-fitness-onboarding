"use client";

export default function JSTestPage() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg p-8 text-white">
        <h1 className="text-2xl font-bold mb-6">JavaScript Test</h1>

        <button
          onClick={() => {
            console.log("Button clicked!");
            alert("JavaScript is working!");
          }}
          className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded mb-4"
        >
          Click Me - Should Show Alert
        </button>

        <button
          onClick={() => {
            const elem = document.getElementById("result");
            if (elem) {
              elem.textContent =
                "Button was clicked at " + new Date().toLocaleTimeString();
            }
          }}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded mb-4"
        >
          Click Me - Should Update Text Below
        </button>

        <div id="result" className="mt-4 p-4 bg-gray-700 rounded">
          Result will appear here...
        </div>

        <div className="mt-4 text-sm text-gray-400">
          If buttons don't work, JavaScript is not executing in your browser.
        </div>
      </div>
    </div>
  );
}
