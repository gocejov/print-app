// src/routes/Routes.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PlayerList from './components/PlayerList';
import TeamList from './components/TeamList';
import Layout from './components/Layout';
const AppRoutes: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />} >
          <Route path="/players" element={<PlayerList />} />
          <Route path="/teams" element={<TeamList />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default AppRoutes;
