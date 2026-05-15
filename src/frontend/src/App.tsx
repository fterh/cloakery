import { Route, BrowserRouter as Router, Routes } from "react-router-dom";

function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <div className="p-8 text-white">
              <h1>Landing Page Placeholder</h1>
            </div>
          }
        />
        <Route
          path="/register"
          element={
            <div className="p-8 text-white">
              <h1>Registration Page Placeholder</h1>
            </div>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
