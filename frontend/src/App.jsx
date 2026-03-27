import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Expenses from './pages/Expenses'
import Budgets from './pages/Budgets'
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="sidebar">
          <div className="logo">💰 Expense Tracker</div>
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Dashboard
          </NavLink>
          <NavLink to="/expenses" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Expenses
          </NavLink>
          <NavLink to="/budgets" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Budgets
          </NavLink>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/budgets" element={<Budgets />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
